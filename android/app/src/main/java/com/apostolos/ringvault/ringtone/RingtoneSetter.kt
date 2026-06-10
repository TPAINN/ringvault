package com.apostolos.ringvault.ringtone

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import com.apostolos.ringvault.data.model.Sound
import com.apostolos.ringvault.data.model.SoundCategory
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

sealed class SetResult {
    /** Downloaded and applied as the default sound. */
    data object Applied : SetResult()

    /** Downloaded and saved, but WRITE_SETTINGS missing — user must set it manually. */
    data class SavedOnly(val folder: String) : SetResult()

    data class Failed(val reason: String) : SetResult()
}

@Singleton
class RingtoneSetter @Inject constructor(
    @ApplicationContext private val context: Context,
    private val client: OkHttpClient,
) {

    fun canWriteSettings(): Boolean = Settings.System.canWrite(context)

    fun writeSettingsIntent(): Intent =
        Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS, Uri.parse("package:${context.packageName}"))

    /**
     * Downloads [sound] into the matching MediaStore audio collection and,
     * if permitted, applies it as the default sound for [category].
     */
    suspend fun downloadAndSet(
        sound: Sound,
        category: SoundCategory,
        applyAsDefault: Boolean,
    ): SetResult = withContext(Dispatchers.IO) {
        val uri = try {
            saveToMediaStore(sound, category)
        } catch (e: Exception) {
            return@withContext SetResult.Failed(e.message ?: "download failed")
        } ?: return@withContext SetResult.Failed("could not create media entry")

        if (!applyAsDefault) return@withContext SetResult.SavedOnly(folderFor(category))

        if (!canWriteSettings()) return@withContext SetResult.SavedOnly(folderFor(category))

        try {
            RingtoneManager.setActualDefaultRingtoneUri(context, ringtoneTypeFor(category), uri)
            SetResult.Applied
        } catch (e: Exception) {
            SetResult.SavedOnly(folderFor(category))
        }
    }

    private fun saveToMediaStore(sound: Sound, category: SoundCategory): Uri? {
        val fileName = sanitizeFileName(sound.title) + "." + sound.format

        val values = ContentValues().apply {
            put(MediaStore.Audio.Media.DISPLAY_NAME, fileName)
            put(MediaStore.Audio.Media.TITLE, sound.title)
            put(MediaStore.Audio.Media.MIME_TYPE, mimeFor(sound.format))
            put(MediaStore.Audio.Media.IS_RINGTONE, category == SoundCategory.RINGTONE)
            put(MediaStore.Audio.Media.IS_NOTIFICATION, category == SoundCategory.NOTIFICATION)
            put(MediaStore.Audio.Media.IS_ALARM, category == SoundCategory.ALARM)
            put(MediaStore.Audio.Media.IS_MUSIC, false)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Audio.Media.RELATIVE_PATH, folderFor(category) + "/")
                put(MediaStore.Audio.Media.IS_PENDING, 1)
            } else {
                @Suppress("DEPRECATION")
                val dir = Environment.getExternalStoragePublicDirectory(legacyDirFor(category))
                dir.mkdirs()
                @Suppress("DEPRECATION")
                put(MediaStore.Audio.Media.DATA, File(dir, fileName).absolutePath)
            }
        }

        val resolver = context.contentResolver
        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        } else {
            @Suppress("DEPRECATION")
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        }

        val uri = resolver.insert(collection, values) ?: return null

        try {
            client.newCall(Request.Builder().url(sound.downloadUrl).build()).execute().use { resp ->
                if (!resp.isSuccessful) throw IllegalStateException("HTTP ${resp.code}")
                resolver.openOutputStream(uri)?.use { out ->
                    resp.body?.byteStream()?.copyTo(out)
                        ?: throw IllegalStateException("empty body")
                } ?: throw IllegalStateException("cannot open output stream")
            }
        } catch (e: Exception) {
            resolver.delete(uri, null, null)
            throw e
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            resolver.update(uri, ContentValues().apply {
                put(MediaStore.Audio.Media.IS_PENDING, 0)
            }, null, null)
        }
        return uri
    }

    private fun ringtoneTypeFor(category: SoundCategory): Int = when (category) {
        SoundCategory.RINGTONE -> RingtoneManager.TYPE_RINGTONE
        SoundCategory.NOTIFICATION -> RingtoneManager.TYPE_NOTIFICATION
        SoundCategory.ALARM -> RingtoneManager.TYPE_ALARM
    }

    private fun folderFor(category: SoundCategory): String = when (category) {
        SoundCategory.RINGTONE -> Environment.DIRECTORY_RINGTONES
        SoundCategory.NOTIFICATION -> Environment.DIRECTORY_NOTIFICATIONS
        SoundCategory.ALARM -> Environment.DIRECTORY_ALARMS
    }

    private fun legacyDirFor(category: SoundCategory): String = folderFor(category)

    private fun mimeFor(format: String): String = when (format.lowercase()) {
        "ogg" -> "audio/ogg"
        "wav" -> "audio/wav"
        "m4a" -> "audio/mp4"
        else -> "audio/mpeg"
    }

    private fun sanitizeFileName(title: String): String =
        title.replace(Regex("[^A-Za-z0-9 _\\-\\u0370-\\u03FF]"), "")
            .trim()
            .replace(Regex("\\s+"), "_")
            .take(60)
            .ifBlank { "ringvault_sound" }
}
