package com.ffglory.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

private data class User(val id:String="",val email:String="",val name:String="",val role:String="user")
private data class Group(val id:String,val name:String,val status:String,val region:String)
private class Store(private val a:android.app.Activity){
    private val key=MasterKey.Builder(a).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
    private val p=EncryptedSharedPreferences.create(a,"ffglory_session",key,EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM)
    var base: String
        get() = p.getString("base","https://signing-providing-efforts-life.trycloudflare.com")!!
        set(v) { p.edit().putString("base",v).apply() }
    var token:String
        get() = p.getString("token","")!!
        set(v) { p.edit().putString("token",v).apply() }
    fun clear(){p.edit().remove("token").apply()}
}
private class Api(private val base:String,private val token:String){
    private val client=OkHttpClient.Builder().connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS).readTimeout(10, java.util.concurrent.TimeUnit.SECONDS).writeTimeout(10, java.util.concurrent.TimeUnit.SECONDS).build()
    suspend fun call(path:String,method:String="GET",body:String?=null): Result<String> =withContext(Dispatchers.IO){runCatching{val b=Request.Builder().url(base.trimEnd('/')+path).header("Authorization","Bearer $token").header("Content-Type","application/json"); if(method!="GET") b.method(method,body?.toRequestBody("application/json".toMediaType()) ?: "".toRequestBody()); try{client.newCall(b.build()).execute().use{r->val s=r.body?.string().orEmpty();if(!r.isSuccessful)error("HTTP ${r.code}: ${s.take(220)}");s}}catch(e:Exception){throw RuntimeException(e.javaClass.simpleName+": "+(e.message?:"unknown"),e)}}}
}
class MainActivity:ComponentActivity(){override fun onCreate(b:Bundle?){super.onCreate(b);setContent{App(Store(this))}}}

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun App(store:Store){
 var token by remember{mutableStateOf(store.token)}; var base by remember{mutableStateOf(store.base)}; var user by remember{mutableStateOf<User?>(null)}
 MaterialTheme(colorScheme=darkColorScheme()){
  if(token.isBlank()) AuthScreen(base,{base=it},onAuth={t,u->store.base=base;store.token=t;token=t;user=u})
  else MainScreen(base,token,user,onUser={user=it},onLogout={store.clear();token=""})
 }
}
@Composable private fun AuthScreen(base:String,setBase:(String)->Unit,onAuth:(String,User)->Unit){
 var email by remember{mutableStateOf("")};var pass by remember{mutableStateOf("")};var name by remember{mutableStateOf("")};var register by remember{mutableStateOf(false)};var err by remember{mutableStateOf("")};var busy by remember{mutableStateOf(false)}
 val scope=rememberCoroutineScope()
 fun submit(){scope.launch{busy=true;err="";val path=if(register)"/auth/register" else "/auth/login";val body=JSONObject().apply{put("email",email);put("password",pass);if(register)put("name",name)}.toString();Api(base,"").call(path,"POST",body).onSuccess{j->val o=JSONObject(j);val u=o.getJSONObject("user");onAuth(o.getString("token"),User(u.optString("id"),u.optString("email"),u.optString("name"),u.optString("role")))}.onFailure{err=it.message?:"Request failed"};busy=false}}
 Column(Modifier.fillMaxSize().padding(24.dp),verticalArrangement=Arrangement.Center){Text("FFGlory",style=MaterialTheme.typography.displaySmall,fontWeight=FontWeight.Bold);Text("Secure reseller dashboard",modifier=Modifier.padding(bottom=18.dp));OutlinedTextField(base,setBase,Modifier.fillMaxWidth(),label={Text("Backend URL")},singleLine=true);Spacer(Modifier.height(8.dp));if(register){OutlinedTextField(name,{name=it},Modifier.fillMaxWidth(),label={Text("Name")},singleLine=true);Spacer(Modifier.height(8.dp))};OutlinedTextField(email,{email=it},Modifier.fillMaxWidth(),label={Text("Email")},singleLine=true);Spacer(Modifier.height(8.dp));OutlinedTextField(pass,{pass=it},Modifier.fillMaxWidth(),label={Text("Password")},singleLine=true);Spacer(Modifier.height(14.dp));Button({submit()},Modifier.fillMaxWidth(),enabled=!busy&&email.isNotBlank()&&pass.length>=8){Text(if(register)"Create account" else "Login")};TextButton({register=!register;err=""},Modifier.align(Alignment.CenterHorizontally)){Text(if(register)"Already have an account? Login" else "Create new account")};if(busy)CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally).padding(10.dp));if(err.isNotBlank())Text(err,color=MaterialTheme.colorScheme.error)}
}
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScreen(base:String,token:String,user0:User?,onUser:(User)->Unit,onLogout:()->Unit){
    var user by remember{mutableStateOf(user0)}
    var tab by remember{mutableStateOf(0)}
    val api=remember(base,token){Api(base,token)}
    var msg by remember{mutableStateOf("")}
    val scope=rememberCoroutineScope()

    LaunchedEffect(Unit){
        api.call("/auth/me").onSuccess{j->
            val u=JSONObject(j).getJSONObject("user")
            user=User(u.optString("id"),u.optString("email"),u.optString("name"),u.optString("role"))
            onUser(user!!)
        }
    }

    Scaffold(
        topBar={
            TopAppBar(
                title={Text("FFGlory")},
                actions={
                    IconButton(onClick={
                        scope.launch{
                            api.call("/auth/logout")
                            onLogout()
                        }
                    }){
                        Icon(Icons.Default.ExitToApp,"Logout")
                    }
                }
            )
        },
        bottomBar={
            NavigationBar{
                val names=if(user?.role=="admin")
                    listOf("Home","Groups","Coupons","History","Alerts","Admin")
                else
                    listOf("Home","Groups","Coupons","History","Alerts")

                val icons=if(user?.role=="admin")
                    listOf(Icons.Default.Home,Icons.Default.Groups,Icons.Default.CardGiftcard,Icons.Default.History,Icons.Default.Notifications,Icons.Default.AdminPanelSettings)
                else
                    listOf(Icons.Default.Home,Icons.Default.Groups,Icons.Default.CardGiftcard,Icons.Default.History,Icons.Default.Notifications)

                names.forEachIndexed{i,n->
                    NavigationBarItem(
                        selected=tab==i,
                        onClick={tab=i},
                        icon={Icon(icons[i],null)},
                        label={Text(n)}
                    )
                }
            }
        }
    ){padding->
        Column(
            Modifier.padding(padding).fillMaxSize()
        ){
            when(tab){
                0->Home(user,api,{msg=it})
                1->Groups(api,{msg=it})
                2->Coupons(api,{msg=it})
                3->History(api)
                4->Notifications(api,{msg=it})
                5->Admin(api,{msg=it})
            }
            if(msg.isNotBlank())
                Text(
                    msg,
                    color=MaterialTheme.colorScheme.error,
                    modifier=Modifier.padding(12.dp)
                )
        }
    }
}

@Composable private fun Home(u:User?,api:Api,setMsg:(String)->Unit){var data by remember{mutableStateOf("")};LaunchedEffect(Unit){api.call("/api/pricing").onSuccess{data=it.take(1000)}.onFailure{setMsg(it.message?:"")}};LazyColumn(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text("Dashboard",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold)};item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text(u?.name?.ifBlank{"Account"}?:"Account",style=MaterialTheme.typography.titleLarge);Text(u?.email.orEmpty());Text("Role: ${u?.role}")}}};item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text("Pricing / API status",fontWeight=FontWeight.Bold);Text(data.ifBlank{"Loading…"})}}}}
}
@Composable private fun Groups(api:Api,setMsg:(String)->Unit){var groups by remember{mutableStateOf<List<Group>>(emptyList())};var region by remember{mutableStateOf("" )};var clan by remember{mutableStateOf("")};var busy by remember{mutableStateOf(false)};val scope=rememberCoroutineScope();fun load(){scope.launch{busy=true;api.call("/api/groups").onSuccess{groups=parseGroups(it)}.onFailure{setMsg(it.message?:"")};busy=false}};LaunchedEffect(Unit){load()};Column(Modifier.padding(16.dp)){Text("Groups",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold);Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){OutlinedTextField(region,{region=it},Modifier.weight(1f),label={Text("Region")},singleLine=true);OutlinedTextField(clan,{clan=it},Modifier.weight(1f),label={Text("Clan ID")},singleLine=true)};Button({scope.launch{api.call("/api/groups","POST",JSONObject().put("region",region).put("clan_id",clan).toString()).onSuccess{load()}.onFailure{setMsg(it.message?:"")}}},enabled=!busy,modifier=Modifier.fillMaxWidth()){Text("Create Group")};if(busy)CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally));LazyColumn(verticalArrangement=Arrangement.spacedBy(8.dp)){items(groups){g->Card(Modifier.fillMaxWidth()){Column(Modifier.padding(14.dp)){Text(g.name.ifBlank{g.id},fontWeight=FontWeight.Bold);Text("${g.status} • ${g.region}");Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){listOf("launch","restart","stop","delete").forEach{a->TextButton({scope.launch{api.call("/api/groups/action","POST",JSONObject().put("action",a).put("group_id",g.id).toString()).onSuccess{load()}.onFailure{setMsg(it.message?:"")}}}){Text(a.replaceFirstChar{it.uppercase()})}}}}}}}}}
@Composable private fun Coupons(api:Api,setMsg:(String)->Unit){var code by remember{mutableStateOf("")};var basic by remember{mutableStateOf("0")};var premium by remember{mutableStateOf("0")};var data by remember{mutableStateOf("")};val scope=rememberCoroutineScope();fun load(){scope.launch{api.call("/api/coupons").onSuccess{data=it.take(3000)}.onFailure{setMsg(it.message?:"")}}};LaunchedEffect(Unit){load()};Column(Modifier.padding(16.dp)){Text("Coupons",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold);OutlinedTextField(basic,{basic=it},label={Text("Basic credits")},singleLine=true);OutlinedTextField(premium,{premium=it},label={Text("Premium credits")},singleLine=true);Button({scope.launch{api.call("/api/coupons","POST",JSONObject().put("basic_credits",basic.toIntOrNull()?:0).put("premium_credits",premium.toIntOrNull()?:0).toString()).onSuccess{load()}.onFailure{setMsg(it.message?:"")}}}){Text("Create Coupon")};Spacer(Modifier.height(8.dp));OutlinedTextField(code,{code=it},Modifier.fillMaxWidth(),label={Text("Redeem code")},singleLine=true);Button({scope.launch{api.call("/api/coupons/redeem","POST",JSONObject().put("code",code).toString()).onSuccess{load()}.onFailure{setMsg(it.message?:"")}}}){Text("Redeem")};Spacer(Modifier.height(12.dp));Text(data.ifBlank{"Loading…"})}}
@Composable private fun History(api:Api){var data by remember{mutableStateOf("")};LaunchedEffect(Unit){api.call("/api/transactions").onSuccess{data=it.take(5000)}};LazyColumn(Modifier.padding(16.dp)){item{Text("Transactions & History",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold)};item{Text(data.ifBlank{"Loading…"})}}}
private fun parseGroups(raw:String):List<Group>{val r=JSONObject(raw);val a=r.optJSONArray("groups")?:r.optJSONArray("data")?:JSONArray();return buildList{for(i in 0 until a.length()){val o=a.optJSONObject(i)?:continue;add(Group(o.optString("id"),o.optString("name",o.optString("group_name")),o.optString("status"),o.optString("region")))}}}

@Composable private fun Notifications(api:Api,setMsg:(String)->Unit){var data by remember{mutableStateOf("")};LaunchedEffect(Unit){api.call("/api/notifications").onSuccess{data=it.take(5000)}.onFailure{setMsg(it.message?:"")}};LazyColumn(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Text("Notifications",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold)};item{Card(Modifier.fillMaxWidth()){Text(data.ifBlank{"No notifications"},Modifier.padding(16.dp))}}}}
@Composable private fun Admin(api:Api,setMsg:(String)->Unit){var users by remember{mutableStateOf("")};var audit by remember{mutableStateOf("")};val scope=rememberCoroutineScope();fun load(){scope.launch{api.call("/admin/users").onSuccess{users=it.take(5000)}.onFailure{setMsg(it.message?:"")};api.call("/admin/audit?limit=100").onSuccess{audit=it.take(5000)}}};LaunchedEffect(Unit){load()};LazyColumn(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Text("Admin Panel",style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold)};item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text("Users",fontWeight=FontWeight.Bold);Text(users.ifBlank{"Loading…"})}}};item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text("Audit Log",fontWeight=FontWeight.Bold);Text(audit.ifBlank{"Loading…"})}}}}}
