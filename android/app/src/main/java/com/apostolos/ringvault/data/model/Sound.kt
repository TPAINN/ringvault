package com.apostolos.ringvault.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

enum class SoundCategory(val apiValue: String) {
    RINGTONE("ringtone"),
    NOTIFICATION("notification"),
    ALARM("alarm");
}

@Serializable
data class Sound(
    @SerialName("_id") val id: String,
    val title: String,
    val category: String,
    val tags: List<String> = emptyList(),
    val durationSec: Int = 0,
    val source: String = "",
    val previewUrl: String,
    val downloadUrl: String,
    val format: String = "mp3",
    val license: String = "",
    val author: String = "",
    val popularity: Int = 0,
    val createdAt: String = "",
)

@Serializable
data class SoundPage(
    val items: List<Sound> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pages: Int = 0,
)
