plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("org.jetbrains.kotlin.plugin.compose") }

android { namespace="com.ffglory.app"; compileSdk=34
    compileOptions { sourceCompatibility=JavaVersion.VERSION_21; targetCompatibility=JavaVersion.VERSION_21 }
    kotlinOptions { jvmTarget="21" }
 defaultConfig { applicationId="com.ffglory.app"; minSdk=26; targetSdk=35; versionCode=62; versionName="4.2" }
 buildTypes {
   getByName("debug") { isMinifyEnabled = false }
   getByName("release") { isMinifyEnabled = false }
 }
}
dependencies { implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.security:security-crypto:1.1.0-alpha06"); implementation("androidx.activity:activity-compose:1.9.2"); implementation("androidx.compose.ui:ui:1.7.6"); implementation("androidx.compose.material3:material3:1.3.1"); implementation("androidx.compose.material:material-icons-extended:1.7.6"); implementation("androidx.compose.ui:ui-tooling-preview:1.7.6"); debugImplementation("androidx.compose.ui:ui-tooling:1.7.6"); implementation("com.squareup.okhttp3:okhttp:4.12.0"); implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0"); implementation("org.json:json:20240303") }
