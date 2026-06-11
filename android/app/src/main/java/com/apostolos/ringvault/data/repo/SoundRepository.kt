package com.apostolos.ringvault.data.repo

import android.content.Context
import com.apostolos.ringvault.data.api.RingVaultApi
import com.apostolos.ringvault.data.model.Sound
import com.apostolos.ringvault.data.model.SoundCategory
import com.apostolos.ringvault.data.model.SoundPage
import com.apostolos.ringvault.data.model.TagCount
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

sealed class CatalogResult {
    data class Online(val page: SoundPage) : CatalogResult()
    data class Offline(val items: List<Sound>) : CatalogResult()
}

@Singleton
class SoundRepository @Inject constructor(
    private val api: RingVaultApi,
    private val json: Json,
    @ApplicationContext private val context: Context,
) {

    suspend fun getSounds(
        category: SoundCategory,
        sort: String,
        page: Int,
        tag: String? = null,
    ): CatalogResult = try {
        val result = api.getSounds(
            category = category.apiValue,
            sort = sort,
            tags = tag,
            page = page,
        )
        if (page == 1 && tag == null) writeCache(category, sort, result)
        CatalogResult.Online(result)
    } catch (e: Exception) {
        // Backend down → last cached page, else hardcoded fallback
        val cached = readCache(category, sort)
        if (cached != null) {
            CatalogResult.Offline(cached.items)
        } else {
            CatalogResult.Offline(FallbackCatalog.sounds.filter { it.category == category.apiValue })
        }
    }

    /** Instant first paint: last successful page from disk, no network. */
    suspend fun readCache(category: SoundCategory, sort: String): SoundPage? =
        withContext(Dispatchers.IO) {
            try {
                val f = cacheFile(category, sort)
                if (!f.exists()) null
                else json.decodeFromString<SoundPage>(f.readText())
            } catch (_: Exception) {
                null
            }
        }

    private suspend fun writeCache(category: SoundCategory, sort: String, page: SoundPage) =
        withContext(Dispatchers.IO) {
            try {
                cacheFile(category, sort).writeText(json.encodeToString(SoundPage.serializer(), page))
            } catch (_: Exception) {
                // cache is best-effort
            }
        }

    private fun cacheFile(category: SoundCategory, sort: String): File =
        File(context.cacheDir, "catalog_${category.apiValue}_$sort.json")

    suspend fun getTags(category: SoundCategory): List<TagCount> = try {
        api.getTags(category.apiValue)
    } catch (_: Exception) {
        emptyList()
    }

    suspend fun reportDownload(id: String) {
        try {
            api.reportDownload(id)
        } catch (_: Exception) {
            // popularity counter is best-effort
        }
    }
}

/**
 * Built-in catalog shown when the backend is unreachable.
 * All entries are CC0 sounds hosted on Wikimedia Commons (stable URLs).
 */
object FallbackCatalog {
    val sounds = listOf(
        Sound(
            id = "fallback-1",
            title = "Classic Phone Ring",
            category = "ringtone",
            tags = listOf("classic", "phone"),
            durationSec = 10,
            source = "builtin",
            previewUrl = "https://upload.wikimedia.org/wikipedia/commons/0/0c/Hard_phone_ringing.ogg",
            downloadUrl = "https://upload.wikimedia.org/wikipedia/commons/0/0c/Hard_phone_ringing.ogg",
            format = "ogg",
            license = "CC0",
            author = "Wikimedia Commons",
        ),
        Sound(
            id = "fallback-2",
            title = "Soft Bell Chime",
            category = "notification",
            tags = listOf("bell", "soft"),
            durationSec = 3,
            source = "builtin",
            previewUrl = "https://upload.wikimedia.org/wikipedia/commons/9/9d/Bell_tone.ogg",
            downloadUrl = "https://upload.wikimedia.org/wikipedia/commons/9/9d/Bell_tone.ogg",
            format = "ogg",
            license = "CC0",
            author = "Wikimedia Commons",
        ),
        Sound(
            id = "fallback-3",
            title = "Morning Rooster",
            category = "alarm",
            tags = listOf("rooster", "morning"),
            durationSec = 8,
            source = "builtin",
            previewUrl = "https://upload.wikimedia.org/wikipedia/commons/c/c3/Rooster_crowing.ogg",
            downloadUrl = "https://upload.wikimedia.org/wikipedia/commons/c/c3/Rooster_crowing.ogg",
            format = "ogg",
            license = "CC0",
            author = "Wikimedia Commons",
        ),
    )
}
