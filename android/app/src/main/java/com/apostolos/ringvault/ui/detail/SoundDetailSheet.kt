package com.apostolos.ringvault.ui.detail

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.RingVolume
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.apostolos.ringvault.R
import com.apostolos.ringvault.data.model.Sound
import com.apostolos.ringvault.data.model.SoundCategory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SoundDetailSheet(
    sound: Sound,
    onDismiss: () -> Unit,
    onSetAs: (SoundCategory) -> Unit,
    onSave: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(sound.title, style = MaterialTheme.typography.headlineSmall)

            // CC-BY attribution requirement: always show author + license
            if (sound.author.isNotBlank() || sound.license.isNotBlank()) {
                Text(
                    text = stringResource(R.string.license_by, sound.author, sound.license),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Text(
                text = stringResource(R.string.duration_seconds, sound.durationSec),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(Modifier.height(8.dp))

            ActionButton(Icons.Filled.RingVolume, stringResource(R.string.action_set_ringtone)) {
                onSetAs(SoundCategory.RINGTONE)
            }
            ActionButton(Icons.Filled.Notifications, stringResource(R.string.action_set_notification)) {
                onSetAs(SoundCategory.NOTIFICATION)
            }
            ActionButton(Icons.Filled.Alarm, stringResource(R.string.action_set_alarm)) {
                onSetAs(SoundCategory.ALARM)
            }

            OutlinedButton(onClick = onSave, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.Save, contentDescription = null)
                Spacer(Modifier.padding(4.dp))
                Text(stringResource(R.string.action_save))
            }
        }
    }
}

@Composable
private fun ActionButton(icon: ImageVector, label: String, onClick: () -> Unit) {
    Button(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Icon(icon, contentDescription = null)
        Spacer(Modifier.padding(4.dp))
        Text(label)
    }
}
