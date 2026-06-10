package com.apostolos.ringvault.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.apostolos.ringvault.R
import com.apostolos.ringvault.data.model.SoundCategory
import com.apostolos.ringvault.ui.detail.SoundDetailSheet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(viewModel: HomeViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsState()
    val event by viewModel.events.collectAsState()
    val nowPlayingId by viewModel.previewPlayer.nowPlayingId.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    val msgSetSuccess = stringResource(R.string.msg_set_success)
    val msgError = stringResource(R.string.msg_error)
    val msgSavedManual = stringResource(R.string.msg_saved_manual)
    val msgPermission = stringResource(R.string.msg_permission_needed)
    val openSettingsLabel = stringResource(R.string.open_settings)

    LaunchedEffect(event) {
        when (val e = event) {
            is HomeEvent.SetSuccess -> snackbarHostState.showSnackbar(msgSetSuccess)
            is HomeEvent.SavedOnly -> snackbarHostState.showSnackbar(msgSavedManual)
            is HomeEvent.Error -> snackbarHostState.showSnackbar(msgError)
            is HomeEvent.NeedsWriteSettings -> {
                val result = snackbarHostState.showSnackbar(
                    message = msgPermission,
                    actionLabel = openSettingsLabel,
                )
                if (result == SnackbarResult.ActionPerformed) {
                    context.startActivity(viewModel.writeSettingsIntent())
                }
            }
            null -> {}
        }
        if (event != null) viewModel.consumeEvent()
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text(stringResource(R.string.app_name)) }) },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            val categories = SoundCategory.entries
            TabRow(selectedTabIndex = categories.indexOf(state.category)) {
                categories.forEach { category ->
                    Tab(
                        selected = state.category == category,
                        onClick = { viewModel.selectCategory(category) },
                        text = {
                            Text(
                                stringResource(
                                    when (category) {
                                        SoundCategory.RINGTONE -> R.string.tab_ringtones
                                        SoundCategory.NOTIFICATION -> R.string.tab_notifications
                                        SoundCategory.ALARM -> R.string.tab_alarms
                                    }
                                )
                            )
                        },
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = state.sort == SortMode.NEW,
                    onClick = { viewModel.selectSort(SortMode.NEW) },
                    label = { Text(stringResource(R.string.chip_new)) },
                )
                FilterChip(
                    selected = state.sort == SortMode.POPULAR,
                    onClick = { viewModel.selectSort(SortMode.POPULAR) },
                    label = { Text(stringResource(R.string.chip_popular)) },
                )
            }

            if (state.isOffline) {
                Text(
                    text = stringResource(R.string.offline_catalog),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                )
            }

            Box(modifier = Modifier.fillMaxSize()) {
                when {
                    state.isLoading && state.sounds.isEmpty() -> {
                        CircularProgressIndicator(Modifier.align(Alignment.Center))
                    }
                    state.sounds.isEmpty() -> {
                        Text(
                            text = stringResource(R.string.empty_list),
                            modifier = Modifier.align(Alignment.Center),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    else -> {
                        val listState = rememberLazyListState()

                        val shouldLoadMore by remember {
                            derivedStateOf {
                                val lastVisible =
                                    listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
                                lastVisible >= listState.layoutInfo.totalItemsCount - 5
                            }
                        }
                        LaunchedEffect(shouldLoadMore) {
                            if (shouldLoadMore) viewModel.loadMore()
                        }

                        LazyColumn(
                            state = listState,
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                                horizontal = 16.dp,
                                vertical = 8.dp,
                            ),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            items(state.sounds, key = { it.id }) { sound ->
                                SoundCard(
                                    sound = sound,
                                    isPlaying = nowPlayingId == sound.id,
                                    onTogglePlay = { viewModel.togglePreview(sound) },
                                    onDownload = { viewModel.saveToDevice(sound) },
                                    onClick = { viewModel.openDetail(sound) },
                                )
                            }
                        }
                    }
                }

                if (state.isWorking) {
                    CircularProgressIndicator(Modifier.align(Alignment.Center))
                }
            }
        }
    }

    state.selectedSound?.let { sound ->
        SoundDetailSheet(
            sound = sound,
            onDismiss = viewModel::closeDetail,
            onSetAs = { category -> viewModel.setAs(sound, category) },
            onSave = { viewModel.saveToDevice(sound) },
        )
    }
}
