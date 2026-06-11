package com.apostolos.ringvault.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single shared preview player — only one sound plays at a time.
 * Exposes the currently playing sound id (null = stopped) and playback
 * progress in [0, 1] for the ring indicator around the play button.
 */
@Singleton
class PreviewPlayer @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val _nowPlayingId = MutableStateFlow<String?>(null)
    val nowPlayingId: StateFlow<String?> = _nowPlayingId

    private val _progress = MutableStateFlow(0f)
    val progress: StateFlow<Float> = _progress

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var progressJob: Job? = null

    private val player: ExoPlayer by lazy {
        ExoPlayer.Builder(context).build().apply {
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    if (state == Player.STATE_ENDED || state == Player.STATE_IDLE) {
                        _nowPlayingId.value = null
                        stopProgressTracking()
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
        startProgressTracking()
    }

    fun stop() {
        player.stop()
        player.clearMediaItems()
        _nowPlayingId.value = null
        stopProgressTracking()
    }

    fun release() {
        stopProgressTracking()
        player.release()
        _nowPlayingId.value = null
        scope.cancel()
    }

    private fun startProgressTracking() {
        progressJob?.cancel()
        progressJob = scope.launch {
            while (isActive) {
                val duration = player.duration
                _progress.value = if (duration > 0) {
                    (player.currentPosition.toFloat() / duration).coerceIn(0f, 1f)
                } else {
                    0f
                }
                delay(50)
            }
        }
    }

    private fun stopProgressTracking() {
        progressJob?.cancel()
        progressJob = null
        _progress.value = 0f
    }
}
