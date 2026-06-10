package com.apostolos.ringvault.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.apostolos.ringvault.data.model.Sound
import com.apostolos.ringvault.data.model.SoundCategory
import com.apostolos.ringvault.data.repo.CatalogResult
import com.apostolos.ringvault.data.repo.SoundRepository
import com.apostolos.ringvault.player.PreviewPlayer
import com.apostolos.ringvault.ringtone.RingtoneSetter
import com.apostolos.ringvault.ringtone.SetResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SortMode(val apiValue: String) { NEW("new"), POPULAR("popular") }

data class HomeUiState(
    val category: SoundCategory = SoundCategory.RINGTONE,
    val sort: SortMode = SortMode.NEW,
    val sounds: List<Sound> = emptyList(),
    val isLoading: Boolean = false,
    val isOffline: Boolean = false,
    val page: Int = 1,
    val hasMore: Boolean = false,
    val selectedSound: Sound? = null,
    val isWorking: Boolean = false,
)

sealed class HomeEvent {
    data object SetSuccess : HomeEvent()
    data class SavedOnly(val folder: String) : HomeEvent()
    data object Error : HomeEvent()
    data object NeedsWriteSettings : HomeEvent()
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repo: SoundRepository,
    val previewPlayer: PreviewPlayer,
    private val ringtoneSetter: RingtoneSetter,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _events = MutableStateFlow<HomeEvent?>(null)
    val events: StateFlow<HomeEvent?> = _events.asStateFlow()

    init {
        load(reset = true)
    }

    fun selectCategory(category: SoundCategory) {
        if (category == _uiState.value.category) return
        previewPlayer.stop()
        _uiState.value = _uiState.value.copy(category = category)
        load(reset = true)
    }

    fun selectSort(sort: SortMode) {
        if (sort == _uiState.value.sort) return
        _uiState.value = _uiState.value.copy(sort = sort)
        load(reset = true)
    }

    fun loadMore() {
        val s = _uiState.value
        if (s.isLoading || !s.hasMore) return
        load(reset = false)
    }

    private fun load(reset: Boolean) {
        val s = _uiState.value
        val page = if (reset) 1 else s.page + 1
        _uiState.value = s.copy(isLoading = true, sounds = if (reset) emptyList() else s.sounds)

        viewModelScope.launch {
            when (val result = repo.getSounds(s.category, s.sort.apiValue, page)) {
                is CatalogResult.Online -> {
                    val existing = if (reset) emptyList() else _uiState.value.sounds
                    _uiState.value = _uiState.value.copy(
                        sounds = existing + result.page.items,
                        isLoading = false,
                        isOffline = false,
                        page = page,
                        hasMore = page < result.page.pages,
                    )
                }
                is CatalogResult.Offline -> {
                    _uiState.value = _uiState.value.copy(
                        sounds = result.items,
                        isLoading = false,
                        isOffline = true,
                        page = 1,
                        hasMore = false,
                    )
                }
            }
        }
    }

    fun togglePreview(sound: Sound) {
        previewPlayer.toggle(sound.id, sound.previewUrl)
    }

    fun openDetail(sound: Sound) {
        _uiState.value = _uiState.value.copy(selectedSound = sound)
    }

    fun closeDetail() {
        _uiState.value = _uiState.value.copy(selectedSound = null)
    }

    fun canWriteSettings(): Boolean = ringtoneSetter.canWriteSettings()

    fun writeSettingsIntent() = ringtoneSetter.writeSettingsIntent()

    fun setAs(sound: Sound, category: SoundCategory) {
        if (!ringtoneSetter.canWriteSettings()) {
            _events.value = HomeEvent.NeedsWriteSettings
            return
        }
        download(sound, category, applyAsDefault = true)
    }

    fun saveToDevice(sound: Sound) {
        val category = SoundCategory.entries.firstOrNull { it.apiValue == sound.category }
            ?: SoundCategory.RINGTONE
        download(sound, category, applyAsDefault = false)
    }

    private fun download(sound: Sound, category: SoundCategory, applyAsDefault: Boolean) {
        _uiState.value = _uiState.value.copy(isWorking = true)
        viewModelScope.launch {
            val result = ringtoneSetter.downloadAndSet(sound, category, applyAsDefault)
            _uiState.value = _uiState.value.copy(isWorking = false, selectedSound = null)
            _events.value = when (result) {
                is SetResult.Applied -> {
                    if (sound.source != "builtin") repo.reportDownload(sound.id)
                    HomeEvent.SetSuccess
                }
                is SetResult.SavedOnly -> {
                    if (sound.source != "builtin") repo.reportDownload(sound.id)
                    HomeEvent.SavedOnly(result.folder)
                }
                is SetResult.Failed -> HomeEvent.Error
            }
        }
    }

    fun consumeEvent() {
        _events.value = null
    }

    override fun onCleared() {
        previewPlayer.release()
        super.onCleared()
    }
}
