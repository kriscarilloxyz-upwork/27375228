import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import vuetify from './plugins/vuetify'
import firebase from 'firebase'

firebase.initializeApp({
  apiKey: "AIzaSyChXyr7cjwC5qAshbsBPsqaduKFoPJWzvg",
  authDomain: "upw-27375228.firebaseapp.com",
  databaseURL: "https://upw-27375228-default-rtdb.firebaseio.com",
  projectId: "upw-27375228",
  storageBucket: "upw-27375228.appspot.com",
  messagingSenderId: "67956127304",
  appId: "1:67956127304:web:ee98e80415f18b5af20a7d"
})

Vue.config.productionTip = false

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount('#app')
