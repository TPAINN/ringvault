package com.apostolos.ringvault.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single shared preview player — only one sound plays at a time.
 * Exposes the currently playing sound id (null = stopped).
 */
@Singleton
class PreviewPlayer @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val _nowPlayingId = MutableStateFlow<String?>(null)
    val nowPlayingId: StateFlow<String?> = _nowPlayingId

    private val player: ExoPlayer by lazy {
        ExoPlayer.Builder(context).build().apply {
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    if (state == Player.STATE_ENDED || state == Player.STATE_IDLE) {
                        _nowPlayingId.value = null
                    }
                }
            })
        }
    }

    fun toggle(soundId: String, url: String) {
        if (_nowPlayingId.value == soundId) {
            stop()
            return
        }
        player.setMediaItem(MediaItem.fromUri(url))
        player.prepare()
        player.play()
        _nowPlayingId.value = soundId
    }

    fun stop() {
        player.stop()
        player.clearMediaItems()
        _nowPlayingId.value = null
    }

    fun release() {
        player.release()
        _nowPlayingId.value = null
    }
}
