package com.apostolos.ringvault.data.repo

import com.apostolos.ringvault.data.api.RingVaultApi
import com.apostolos.ringvault.data.model.Sound
import com.apostolos.ringvault.data.model.SoundCategory
import com.apostolos.ringvault.data.model.SoundPage
import javax.inject.Inject
import javax.inject.Singleton

sealed class CatalogResult {
    data class Online(val page: SoundPage) : CatalogResult()
    data class Offline(val items: List<Sound>) : CatalogResult()
}

@Singleton
class SoundRepository @Inject constructor(
    private val api: RingVaultApi,
) {

    suspend fun getSounds(
        category: SoundCategory,
        sort: String,
        page: Int,
    ): CatalogResult = try {
        CatalogResult.Online(api.getSounds(category = category.apiValue, sort = sort, page = page))
    } catch (e: Exception) {
        // Backend down → hardcoded fallback (Phase 1 requirement)
        CatalogResult.Offline(FallbackCatalog.sounds.filter { it.category == category.apiValue })
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
