package com.apostolos.ringvault.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
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
    val playProgress by viewModel.previewPlayer.progress.collectAsState()
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

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            LargeTopAppBar(
                title = {
                    Text(
                        stringResource(R.string.app_name),
                        fontWeight = FontWeight.Bold,
                    )
                },
                scrollBehavior = scrollBehavior,
            )
        },
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
                        // Adaptive grid: 1 column on phones, 2+ on tablets/landscape
                        val gridState = rememberLazyGridState()

                        val shouldLoadMore by remember {
                            derivedStateOf {
                                val lastVisible =
                                    gridState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
                                lastVisible >= gridState.layoutInfo.totalItemsCount - 5
                            }
                        }
                        LaunchedEffect(shouldLoadMore) {
                            if (shouldLoadMore) viewModel.loadMore()
                        }

                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 340.dp),
                            state = gridState,
                            contentPadding = PaddingValues(
                                start = 16.dp,
                                end = 16.dp,
                                top = 8.dp,
                                bottom = 24.dp,
                            ),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            items(state.sounds, key = { it.id }) { sound ->
                                SoundCard(
                                    sound = sound,
                                    isPlaying = nowPlayingId == sound.id,
                                    progress = if (nowPlayingId == sound.id) playProgress else 0f,
                                    onTogglePlay = { viewModel.togglePreview(sound) },
                                    onDownload = { viewModel.saveToDevice(sound) },
                                    onClick = { viewModel.openDetail(sound) },
                                    modifier = Modifier.animateItem(),
                                )
                            }
                        }
                    }
                }

                if (state.isWorking) {
                    // Scrim blocks interaction while a download is in flight
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.scrim.copy(alpha = 0.35f))
                            .pointerInput(Unit) {},
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
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
