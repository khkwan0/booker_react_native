import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  AsyncStorage,
  TextInput,
  Button,
  ToolbarAndroid,
  Image,
  ScrollView
} from 'react-native';
import { StackNavigator } from 'react-navigation'
import { Calendar, CalendarList, Agenda } from 'react-native-calendars'
import ImagePicker from 'react-native-image-crop-picker'

import parseAddress from 'parse-address'
import Config from './config.js'


const FBSDK = require('react-native-fbsdk')
const {
  LoginButton,
  AccessToken,
  LoginManager,
  GraphRequest,
  GraphRequestManager,
} = FBSDK

class MyToolBar extends Component {

  constructor(props) {
    super(props);
    this.handleAction = this.handleAction.bind(this);
  }

  handleAction(position) {
    if (position === 3) {
      this.props.doLogout()
    }
    if (position === 1) {
      this.props.gotoVenue()
    }
    if (position === 2) {
      this.props.gotoArtist()
    }
  }
  render() {
    return (
      <ToolbarAndroid style={{height: 50,backgroundColor:'powderblue'}} title="Playourcity"
        actions = {
          [
            {title: this.props.user.uname},
            {title: 'Venues'},
            {title: 'Artist'},
            {title: 'Logout'}
          ]
        }
        onActionSelected = {this.handleAction}
      />
    )
  }
}

class MyCalendar extends Component {
  constructor(props) {
    super(props)
    this.state = {
      dates: [],
      refid: props.navigation.state.params.entity._id
    }
    this.handleDayPress = this.handleDayPress.bind(this)
    this.saveAvail = this.saveAvail.bind(this)
  }

  componentDidMount() {
      fetch(Config.dev.host+'/getavail?refid='+this.state.refid,
        {
          method: 'GET'
        }
      )
      .then((result) => { return result.json() })
      .then((resultJson) => {

        this.setState({
          dates: resultJson.blackout
        })
      })
      .catch((err) => {
        alert('load err' + err)
      })
  }

  handleDayPress(day) {
    let dates = this.state.dates;
    let index = dates.indexOf(day.dateString)
    if (index >= 0) {
      dates.splice(index, 1)
    } else {
      dates.push(day.dateString)
    }
    this.setState({
      dates: dates
    })
    this.saveAvail()
  }

  saveAvail() {
    if (this.state.refid) {
      fetch(Config.dev.host+'/saveavail',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(
            {
              refid: this.state.refid,
              blackout: this.state.dates,
              avail: []
            }
          )
        }
      )
      .then((result) => { return result.json()})
      .then((resultJson) => {
        if (typeof resultJson.ok === 'undefined') {
          alert(resultJson.msg)
        }
      })
      .catch((err) => {
        alert(err)
      })
    }
  }

  render() {
    let dates = {}
    this.state.dates.map((day, idx) => {
      dates[day] = {selected: true, marked: true}
    })
    return (
      <Calendar
       onDayPress={this.handleDayPress}
       markedDates = {dates}
       />
    )
  }
}
class UserLogin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      pwd: ''
    }
    this.changeEmail = this.changeEmail.bind(this)
    this.changePwd = this.changePwd.bind(this)
    this.doLogin = this.doLogin.bind(this)
    this.handleFBLogin = this.handleFBLogin.bind(this)
  }

  changeEmail(text) {
    this.setState({
      email: text
    })
  }

  changePwd(text) {
    this.setState({
      pwd: text
    })
  }

  doLogin() {

    if (this.state.email && this.state.pwd) {
      fetch(Config.dev.host+'/loginmobile',
        {
          method:'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body:JSON.stringify({email:this.state.email, pw: this.state.pwd})
        }
      )
      .then((result) => {return result.json()})
      .then((resultJson) => {
        if (resultJson.user) {
          this.props.postLogin(resultJson.user);
        }
      })
      .catch((err) => {
        console.log(err)
      })
    }
  }

  handleFBLogin(err, res) {
    if (err) {
      alert(res.error)
    } else {
      AccessToken.getCurrentAccessToken()
      .then((data) => {
        let infoRequest = new GraphRequest('/me?fields=id,name,email,picture', null, (err, result) => {
          if (err) {
            alert('Error: '+ err);
          } else {
            fetch(Config.dev.host+'/fb',
              {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(result)
              }
            )
            .then((result) => {
              return result.json()
            })
            .then((resultJson) => {
              this.props.postLogin(resultJson.msg)
            })
            .catch((err) => {
              alert('Err: ' + err)
            })
          }
        })
        new GraphRequestManager().addRequest(infoRequest).start()
      })
      .catch((err) => {
        alert(err)
      })
    }
  }
  render() {
    return (
      <View>
        <View style={{marginBottom: 10}}>
          <LoginButton
            readPermissions={["public_profile","email","user_friends"]}
            onLoginFinished={this.handleFBLogin}
          />
        </View>
        <Image source={require('./logo.png')} />
        <View>
          <TextInput placeholder="Email" style={{width: 190}} onChangeText={this.changeEmail} value={this.state.email} />
          <TextInput placeholder="Password" style={{width: 190}} secureTextEntry={true} onChangeText={this.changePwd} value={this.state.pwd} />
          <Button style={{width: '100px'}} title="Login" color="#841584" onPress={this.doLogin} />
        </View>
      </View>
    )
  }
}

class AddNewVenue extends Component {
  constructor() {
    super()
    this.state = {
      venueName: '',
      address1: '',
      address2: '',
      zip: '',
      desc: '',
      cap: '',
      email: '',
      phone: '',
      url: '',
      image: '',
      showSave: false,
      orig: '',
      th: '',
      parsed: {},
      location: {
        type: "Point",
        coordinates: [-118.387960, 34.090613]
      },
      typingTimeout: null
    }
    this.onChangeVenueName = this.onChangeVenueName.bind(this)
    this.onChangeAdd1 = this.onChangeAdd1.bind(this)
    this.onChangeAdd2 = this.onChangeAdd2.bind(this)
    this.onChangeZip =this.onChangeZip.bind(this)
    this.onChangeCap = this.onChangeCap.bind(this)
    this.onChangeEmail = this.onChangeEmail.bind(this)
    this.onChangePhone = this.onChangePhone.bind(this)
    this.onChangeDesc = this.onChangeDesc.bind(this)
    this.onChangeUrl = this.onChangeUrl.bind(this)
    this.onImagePickerPress = this.onImagePickerPress.bind(this)
    this.onSavePress = this.onSavePress.bind(this)
    this.checkComplete = this.checkComplete.bind(this)
    this.checkAddress = this.checkAddress.bind(this)
  }

  checkAddress(parsed) {
    let street = parsed.street
    let number = parsed.number
    let zip = this.state.zip
    if (street && number && zip) {
      fetch(Config.dev.host+'/getlonglat?st=' + street + '&nm=' + number + '&zip' + zip,
        method: 'GET'
      )
      .then((result) => { return result.json() })
      .then((resultJson) => {
        let coords = [];
        coords.push(resultJson.lng);
        coord.push(resultJson.lat);
        this.setState({
          location: {
            type: "Point",
            coordinates: coords
          }
        })
      })
      .catch((err) => {
        alert(err)
      })
    }
  }

  onChangeVenueName(val) {
    this.setState({
      venueName: val
    })
    this.checkComplete()
  }

  onChangeAdd1(val) {
    if (this.state.typingTimeout) {
      clearTimeout(this.state.typingTimeout)
    }
    let parsed =  parseAddress.parseLocation(val)
    this.setState({
      address1: val,
      parsed: parsed,
      typingTimeout: setTimeout(() => {this.checkAddress(parsed)}, 1000)
    })
    this.checkComplete()
  }

  onChangeAdd2(val) {
    this.setState({
      address2: val
    })
    this.checkComplete()
  }

  onChangeZip(val) {
    this.setState({
      zip: val
    })
    this.checkComplete()
  }

  onChangeEmail(val) {
    this.setState({
      email: val
    })
    this.checkComplete()
  }

  onChangePhone(val) {
    this.setState({
      phone: val
    })
    this.checkComplete()
  }

  onChangeDesc(val) {
    this.setState({
      desc: val
    })
    this.checkComplete()
  }

  onChangeCap(val) {
    this.setState({
      cap: val
    })
    this.checkComplete()
  }

  onChangeUrl(val) {
    this.setState({
      url: val
    })
    this.checkComplete()
  }

  onImagePickerPress() {
    ImagePicker.openPicker({
      width:300,
      height:400
    })
    .then((image) => {
      console.log(image)
    })
    .catch((err) => {
      alert(err)
    })
  }

  checkComplete() {
    if (this.state.venueName &&
        this.state.address1 &&
        this.state.zip &&
        this.state.cap &&
        (this.state.email || this.state.phone)
    ) {
      this.setState({
        showSave: true
      })
    } else {
      this.setState({
        showSave: false
      })
    }
  }

  onSavePress() {
    AsyncStorage.getItem('@MySuperStore:key')
    .then((res) => {
      if (res) {
        let user = JSON.parse(res)
        toSave = {
          user_id: user._id,
          venueName: this.state.venueName,
          address: this.state.address1,
          parsed: this.state.parsed,
          address2: this.state.address2,
          zip: this.state.zip,
          cap: this.state.cap,
          image: this.state.image,
          th: this.state.th,
          orig: this.state.orig,
          desc: this.state.desc,
          phone: this.state.phone,
          email: this.state.email,
          location: this.state.location,
        }
        fetch(Config.dev.host + '/savevenue',
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(toSave)
          }
        )
        .then((result) => {
          return result.json()
        })
        .then((resultJson) => {
          if (resultJson) {
            this.props.handleAddNewVenue(resultJson.venue)
            this.props.cancel()
          }
        })
        .catch((err) => {
          alert(err)
        })
      }
    })
    .catch((err) => {
      alert(err)
    })
  }

  render() {
    return (
      <View>
        <TextInput onChangeText={this.onChangeVenueName} value={this.state.venueName} placeholder="Venue Name"/>
        <TextInput onChangeText={this.onChangeAdd1} value={this.state.address1} placeholder="Street Address" />
        <TextInput onChangeText={this.onChangeAdd2} value={this.state.address2} placeholder="Street Address 2 (optional)"/>
        <TextInput onChangeText={this.onChangeZip} value={this.state.zip} placeholder="Zip" />
        <TextInput onChangeText={this.onChangeCap} value={this.state.cap.toString()} placeholder="Capacity" />
        <TextInput onChangeText={this.onChangeDesc} value={this.state.desc} placeholder="Decscribe your venue (optional)" />
        <TextInput onChangeText={this.onChangeEmail} value={this.state.email} placeholder="Contact Email" />
        <TextInput onChangeText={this.onChangePhone} value={this.state.phone} placeholder="Contact Phone" />
        <TextInput onChangeText={this.onChangeUrl} value={this.state.url} placeholder="Web page URL Address (optional)" />
        <View style={{flexDirection: 'row', justifyContent: 'center', alignItems:'center'}}>
          <View style={{width:'30%'}}>
            <Button onPress={this.onImagePickerPress} title="Add images" />
          </View>
          { this.state.showSave &&
            <View style={{paddingLeft:'1%', width: '20%'}}>
              <Button onPress={this.onSavePress} title="Save" />
            </View>
          }
          <View style={{paddingLeft: '1%', width: '20%'}}>
            <Button onPress={this.props.cancel} title="Cancel" />
          </View>
        </View>
      </View>
    )
  }
}

class Venues extends Component {

  constructor() {
    super()
    this.state = {
      showAddVenue: false
    }
    this.handleAddVenueClick = this.handleAddVenueClick.bind(this)
    this.navigateToCalendar = this.navigateToCalendar.bind(this)
    this.doCancel = this.doCancel.bind(this)
  }

  static navigationOptions = {
    title: 'Your Venues',
  };

  handleAddVenueClick() {
    this.setState({
      showAddVenue: true
    })
  }

  doCancel() {
    this.setState({
      showAddVenue: false
    })
  }

  navigateToCalendar(venue) {
    //alert(JSON.stringify(venue, null, 1))
    this.props.navigation.navigate('Calendar', {user: this.props.navigation.state.params.user, entity:venue})
  }

  render() {
    const { params } = this.props.navigation.state;
    return (
      <ScrollView style={{backgroundColor:'#ffb875',height:'100%'}}>
        <View>
          <Button title="Add Venue" onPress={this.handleAddVenueClick} />
        </View>
        {this.state.showAddVenue &&
          <View>
            <AddNewVenue cancel={this.doCancel} handleAddNewVenue={params.handleAddNewVenue} />
          </View>
        }
        {params.user.venues &&
          params.user.venues.map((venue) => {
            return (
              <View key={venue._id} style={{backgroundColor:'#ffc68f',marginTop:'2%',marginBottom:'2%',paddingLeft:'2%'}}>
                <Text style={{fontWeight:'bold'}}>{venue.venueName}</Text>
                <Text>{venue.address}</Text>
                <Text>{venue.address2}</Text>
                <Text>{venue.zip}</Text>
                <Text>Capacity: {venue.cap}</Text>
                <Text>{venue.desc}</Text>
                <Text>Contact Phone {venue.phone}</Text>
                <Text>Contact Email {venue.email}</Text>
                {venue.verified?<Text style={{color:'green'}}>Verified</Text>:<Text style={{color:'red'}}>Unverified</Text>}
                <Button title="Calendar" onPress={() => this.navigateToCalendar(venue)} />
              </View>
            )
          })
        }
      </ScrollView>
    )
  }
}

class AddNewArtist extends Component {
  constructor() {
    super()
    this.state = {
      artistName: '',
      desc:'',
      location: {
        type: "Point",
        coordinates: []
      },
      zip: '',
      phone: '',
      email: '',
      isComplete: false,
      genre: ''
    }
    this.onChangeName = this.onChangeName.bind(this)
    this.onChangeDesc = this.onChangeDesc.bind(this)
    this.onChangeZip = this.onChangeZip.bind(this)
    this.onChangeEmail = this.onChangeEmail.bind(this)
    this.onChangePhone = this.onChangePhone.bind(this)
    this.checkComplete = this.checkComplete.bind(this)
    this.doSaveArtist = this.doSaveArtist.bind(this)
  }

  checkComplete() {
    if (this.state.artistName && this.state.zip && (this.state.phone || this.state.email)) {
      this.setState({
        isComplete: true
      })
    }
  }

  doSaveArtist() {
    AsyncStorage.getItem('@MySuperStore:key')
    .then((res) => {
      if (res) {
        let user = JSON.parse(res)
        let toSave = {
          user_id: user._id,
          artist_name: this.state.artistName,
          genre: this.state.genre,
          phone: this.state.phone,
          email: this.state.email,
          web_page: this.state.url,
          desc: this.state.desc,
          zip: this.state.zip,
          location: this.state.location
        }
        fetch(Config.dev.host+'/saveartist',
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(toSave)
          }
        )
        .then((result) => { return result.json() })
        .then((resultJson) => {
          this.props.handleArtistSave(resultJson.msg)
          this.props.cancel()
        })
        .catch((err) => {
          alert(err)
        })
      }
    })
    .catch((err) => {
      alert(err)
    })
  }

  onChangeName(e) {
    this.setState({
      artistName: e
    })
    this.checkComplete()
  }

  onChangeDesc(e) {
    this.setState({
      desc: e
    })
    this.checkComplete()
  }

  onChangeZip(e) {
    this.setState({
      zip: e
    })
    this.checkComplete()
  }

  onChangeEmail(e) {
    this.setState({
      email: e
    })
    this.checkComplete()
  }

  onChangePhone(e) {
    this.setState({
      phone: e
    })
    this.checkComplete()
      }

  onChangeUrl(e) {
    this.setState({
      url: e
    })
    this.checkComplete()
  }

  render() {
    return(
      <View>
        <TextInput onChangeText={this.onChangeName} value={this.state.artistName} placeholder="(Required) Your group/band/artist's name" />
        <TextInput onChangeText={this.onChangeGenre} value={this.state.genre} placeholder="(optonal) Genre" />
        <TextInput onChangeText={this.onChangeDesc} value={this.state.desc} placeholder="(optional) Describe {this.state.artistName}" />
        <TextInput onChangeText={this.onChangeZip} value={this.state.zip} placeholder="(Required) Origin Zip code for {this.state.artistName}" />
        <TextInput onChangeText={this.onChangeEmail} value={this.state.email} placeholder="(Required) Contact Email" />
        <TextInput onChangeText={this.onChangePhone} value={this.state.phone} placeholder="(Required IF no email) Contact Phone" />
        <TextInput onChangeText={this.onChangeUrl} value={this.state.url} placeholder="(optional) http(s)://..." />
        <Button title="Cancel" onPress={this.props.cancel} />
        {this.state.isComplete &&
          <Button title="Save" onPress={this.doSaveArtist} />
        }
      </View>
    )
  }
}

class Artists extends Component {

  static navigationOptions = {
    title: 'Your Artists',
  };

  constructor() {
    super()
    this.state = {
      showAddArtist: false
    }
    this.doCancel = this.doCancel.bind(this)
    this.onAddNewArtist = this.onAddNewArtist.bind(this)
    this.navigateToCalendar = this.navigateToCalendar.bind(this)
  }

  doCancel() {
    this.setState({
      showAddArtist: false
    })
  }

  onAddNewArtist() {
    this.setState({
      showAddArtist: true
    })
  }

  navigateToCalendar(artist) {
    this.props.navigation.navigate('ArtistCalendar', {user: this.props.navigation.state.params.user, entity:artist})
  }

  render() {
    const { params } = this.props.navigation.state
    return (
      <ScrollView>
        <Button onPress={this.onAddNewArtist} title="Add artist" />
        {this.state.showAddArtist &&
          <View>
            <AddNewArtist cancel={this.doCancel} handleArtistSave={params.handleAddNewArtist} />
          </View>
        }
        {params.user.artists &&
          params.user.artists.map((_artist) => {
            let artist = JSON.parse(_artist)
            return (
              <View key={artist._id} style={{backgroundColor:'#ffc68f',marginTop:'2%',marginBottom:'2%',paddingLeft:'2%',paddingRight:'2%'}}>
                <Text style={{fontWeight:'bold'}}>{artist.artist_name}</Text>
                <Text>Genre: {artist.genre}</Text>
                <Text>Description: {artist.desc}</Text>
                <Text>Contact Phone {artist.phone}</Text>
                <Text>Contact Email {artist.email}</Text>
                <Button title="Calendar" onPress={() => this.navigateToCalendar(artist)} />
              </View>
            )
          })
        }
      </ScrollView>
    )
  }
}

class Home extends Component {

  static navigationOptions = {
    header: null
  };

  constructor() {
    super();
    this.state = {
      user: null,
      showLogin: true,
      showGeo: false,
      zip: '',
      editZip: false,
      showZip: false
    }
    this.checkSession = this.checkSession.bind(this)
    this.handleLogin = this.handleLogin.bind(this)
    this.handleLogout = this.handleLogout.bind(this)
    this.navigateToVenues = this.navigateToVenues.bind(this)
    this.getZip = this.getZip.bind(this)
    this.saveZip = this.saveZip.bind(this)
    this.editZip = this.editZip.bind(this)
    this.handleAddNewVenue = this.handleAddNewVenue.bind(this)
    this.handleAddNewArtist = this.handleAddNewArtist.bind(this)
    this.navigateToArtists = this.navigateToArtists.bind(this)
  }

  componentDidMount() {
    this.checkSession();
  }

  checkSession() {
    AsyncStorage.getItem('@MySuperStore:key')
    .then((result) => {
      if (result !== null) {
        let user = JSON.parse(result)
        if (typeof user.fan === 'undefined') {
          this.getZip(user)
        } else {
          this.setState({
            user: user,
            showLogin: false,
          })
        }
      } else {
        this.setState({
          showLogin: true,
        })
      }
    })
    .catch((err) => {
      alert("AsyncStorage Err: " + err)
    })
  }

  handleLogin(user) {
    AsyncStorage.setItem('@MySuperStore:key', JSON.stringify(user))
    .then((result) => {
      if (typeof user.fan === 'undefined') {
        this.getZip(user)
      } else {
        this.setState({
          user: user,
          showLogin: false,
        })
      }
    })
    .catch((err) => {
      alert(err)
    })
  }

  handleLogout() {
    AsyncStorage.removeItem('@MySuperStore:key')
    .then((result) => {
      this.setState({
        showLogin:true,
        user: null
      })
    })
    .catch((err) => {
      console.error(err);
    })
    if (typeof this.state.user.fbid !== 'undefined') {
      LoginManager.logOut()
    }
  }

  handleAddNewArtist(artist) {
    let user = this.state.user
    if (typeof user.artists === 'undefined') {
      user.artists = []
      user.hasArtist = 0
    }
    user.artists.push(artist)
    user.hasArtist = user.hasArtist + 1
    this.setState({
      user: user
    })
    AsyncStorage.setItem('@MySuperStore:key', JSON.stringify(user))
    .then((result) => {

    })
    .catch((err) => {
      alert(err)
    })
  }

  handleAddNewVenue(venue) {
    let user = this.state.user
    if (typeof user.venues === 'undefined') {
      user.venues = []
      user.hasVenue = 0
      user.vwants = 0
    }
    user.venues.push(venue)
    user.hasVenue = user.hasVenue + 1
    this.setState({
      user: user
    })
    AsyncStorage.setItem('@MySuperStore:key', JSON.stringify(user))
    .then((result) => {

    })
    .catch((err) => {
      alert(err)
    })
  }

  getZip(user) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetch(Config.dev.host+'/rgl?lat='+pos.coords.latitude+'&lon='+pos.coords.longitude,
          {
            method: 'GET'
          }
        )
        .then((result) => { return result.json()})
        .then((resultJson) => {
          if (resultJson.ok) {
            this.setState({
              user: user,
              zip: resultJson.msg.zip,
              showZip: true,
              showLogin: false,
            })
          } else {
            alert(resultJson.msg)
          }
        })
        .catch((err) => {
          alert('RGL ERR: '+ err)
        })
      },
      (err) => {
        alert("GEO err: " + err)
      }
    )
  }

  saveZip() {
    fetch(Config.dev.host+'/savefan',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({user: this.state.user, zip: this.state.zip})
      }
    )
    .then((result) => { return result.json()})
    .then((resultJson) => {
      return AsyncStorage.setItem('@MySuperStore:key', JSON.stringify(resultJson.res))
    })
    .catch((err) => {
      alert(err)
    })
  }

  editZip() {
    this.setState({
      editZip: true,
      showZip: false
    })
  }

  navigateToVenues() {
    this.props.navigation.navigate('Venues', {user: this.state.user, handleAddNewVenue: this.handleAddNewVenue})
  }

  navigateToArtists() {
    this.props.navigation.navigate('Artists', {user: this.state.user, handleAddNewArtist: this.handleAddNewArtist})
  }

  render() {
    let buttonTitle = ''
    if (this.state.user && this.state.user.hasVenue) {
      buttonTitle = "You have "+this.state.user.hasVenue+" venues"
    }
    if (this.state.user && this.state.user.hasArtist) {
      artistButtonTitle = "You have "+this.state.user.hasArtist+" artist"
    }
    return (
      <View style={styles.container}>
        {this.state.showLogin &&
          <View style={styles.login}>
            <UserLogin postLogin={this.handleLogin} />
          </View>
        }
        {this.state.user &&
          <View>
            <MyToolBar user={this.state.user} doLogout={this.handleLogout} gotoVenue={this.navigateToVenues} gotoArtist={this.navigateToArtists}/>
            <Text style={styles.welcome}>
              Welcome {this.state.user.uname}
            </Text>
            {this.state.showZip &&
              <View>
                <Text>We think you are in {this.state.zip}</Text>
                <View style={{width:'25%'}}>
                  <Button onPress={this.saveZip} title="Yes" />
                </View>
                <View style={{width:'25%',paddingTop:5}}>
                  <Button onPress={this.editZip} title="No" />
                </View>
              </View>
            }
            {this.state.editZip &&
              <View>
                <Text>Please enter a valid ZIP</Text>
                <TextInput style={{width:100}} placeholder="90069" onChangeText={(text) => {this.setState({zip: text})}} value={this.state.zip} />
                <View style={{width:'50%'}}><Button onPress={this.saveZip} title="Set ZIP" /></View>
              </View>
            }
            {this.state.user.hasVenue &&
              <View>
                <Button
                  onPress={this.navigateToVenues}
                  title={buttonTitle}
                />
                <Text>You have {this.state.user.vwants.length} venues accumulating fans</Text>
              </View>
            }
            {this.state.user.hasArtist &&
              <View>
                <Button
                  onPress={this.navigateToArtists}
                  title={artistButtonTitle}
                />
              </View>
            }
          </View>
        }
      </View>
    )
  }
}

const App = StackNavigator({
  Home: {
    screen: Home
  },
  Venues: {
    screen: Venues
  },
  Artists: {
    screen: Artists
  },
  Calendar: {
    screen: MyCalendar,
    navigationOptions: ({navigation}) => ({
      title: `${navigation.state.params.entity.venueName}`
    })
  },
  ArtistCalendar: {
    screen: MyCalendar,
    navigationOptions: ({navigation}) => ({
      title: `${navigation.state.params.entity.artist_name}`
    })
  }
})


const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10
  },
  login: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

export default App
AppRegistry.registerComponent('playourcity', () => App);
