package com.apostolos.ringvault

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.apostolos.ringvault.ui.home.HomeScreen
import com.apostolos.ringvault.ui.theme.RingVaultTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            RingVaultTheme {
                HomeScreen()
            }
        }
    }
}
