<template>
  <v-app>
    <v-main v-if="user">
      <v-container fill-height>
        <v-row>
          <v-col>
            <v-card>
              <v-card-title class="font-weight-thin primary--text text-uppercase">
                Latest trades
              </v-card-title>
              <v-card-text>
                <v-combobox v-model="symBinance"
                            small-chips
                            label="Binance"
                            multiple></v-combobox>

                <v-combobox v-model="symBitkub"
                            small-chips
                            label="Bitkub"
                            multiple></v-combobox>
              </v-card-text>
              <v-card-actions>
                <v-btn color="warning"
                       dark
                       @click="handleSymSave"
                       :loading="loading">
                  Save
                </v-btn>
              </v-card-actions>
              <v-card-text>
                <v-data-table :items="items"
                              :headers="headers">
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <v-main v-else>
      <v-container fill-height>
        <v-row>
          <v-col cols="12">
            <v-card max-width="400"
                    class="mx-auto"
                    :loading="loading">
              <v-card-title class="font-weight-thin primary--text">
                UPW-27375228
              </v-card-title>
              <v-card-text>
              </v-card-text>
              <v-card-text>
                <v-btn @click="handleLogin"
                       color="primary"
                       dark
                       rounded
                       :loading="loading">
                  Sign in with Google
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import axios from 'axios'
import firebase from 'firebase'

export default {
  name: 'App',

  data: () => ({
    user: false,
    loading: true,
    items: [],
    headers: [
      { text: 'date', value: 'date' },
      { text: 'time', value: 'time' },
      { text: 'coin', value: 'coin' },
      { text: 'order', value: 'order' },
      { text: 'size', value: 'size' },
      { text: 'price', value: 'price' },
      { text: 'fee', value: 'fee' },
    ],
    symBinance: [],
    symBitkub: []
  }),

  watch: {
    user (v) {
      if (v) this.handleFetchTrades()
    }
  },

  mounted () {
    firebase.auth().onAuthStateChanged(user => {
      if (user) this.user = user
    })
  },


  methods: {
    async handleLogin () {
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth()
        .signInWithPopup(provider)
        .then((result) => {
          this.user = result.user
        })
        .catch(() => {
          alert('Something went wrong with your request')
        })
    },

    async handleFetchTrades () {
      this.loading = true
      await firebase.database().ref('/syms/binance')
        .once('value')
        .then(snapshot => {
          this.symBinance = snapshot.val()
        })

      await firebase.database().ref('/syms/bitkub')
        .once('value')
        .then(snapshot => {
          this.symBitkub = snapshot.val()
        })

      const url = process.env.NODE_ENV === 'production' ? ' https://us-central1-upw-27375228.cloudfunctions.net/api/trades' : 'http://localhost:5001/upw-27375228/us-central1/api/trades'
      await axios({
        url,
        method: 'POST',
        data: { auth: this.user }
      })
        .then(response => {
          this.items = response.data
        })
      this.loading = false
    },

    async handleSymSave () {
      this.loading = true
      await firebase.database().ref('/syms/binance').set(this.symBinance)
      await firebase.database().ref('/syms/bitkub').set(this.symBitkub)
      this.handleFetchTrades()
      this.loading = false
    }
  }
};
</script>
