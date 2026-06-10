package com.apostolos.ringvault.data.api

import com.apostolos.ringvault.data.model.Sound
import com.apostolos.ringvault.data.model.SoundPage
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface RingVaultApi {

    @GET("api/sounds")
    suspend fun getSounds(
        @Query("category") category: String? = null,
        @Query("sort") sort: String = "new",
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 30,
    ): SoundPage

    @GET("api/sounds/{id}")
    suspend fun getSound(@Path("id") id: String): Sound

    @POST("api/sounds/{id}/download")
    suspend fun reportDownload(@Path("id") id: String)
}
