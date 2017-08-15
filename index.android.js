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
  Image
} from 'react-native';
import { StackNavigator } from 'react-navigation'
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
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
    if (position === 2) {
      this.props.doLogout();
    }
    if (position === 1) {
      this.props.gotoVenue();
    }
  }
  render() {
    return (
      <ToolbarAndroid style={{height: 50,backgroundColor:'powderblue'}} title="Playourcity"
        actions = {
          [
            {title: this.props.user.uname},
            {title: 'Venues'},
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
      refid: props.navigation.state.params.venue._id
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

class Venues extends Component {

  constructor() {
    super()
    this.state = {
      showAddVenue: false
    }
    this.handleAddVenueClick = this.handleAddVenueClick.bind(this)
    this.navigateToCalendar = this.navigateToCalendar.bind(this)
  }

  static navigationOptions = {
    title: 'Your Venues',
  };

  handleAddVenueClick() {
    this.setState({
      showAddVenue: true
    })
  }

  navigateToCalendar(venue) {
    //alert(JSON.stringify(venue, null, 1))
    this.props.navigation.navigate('Calendar', {user: this.props.navigation.state.params.user, venue:venue})
  }

  render() {
    const { params } = this.props.navigation.state;
    return (
      <View style={{backgroundColor:'#ffb875',height:'100%'}}>
        <View>
          <Button title="Add Venue" onPress={this.handleAddVenueClick} />
        </View>
        {this.state.showAddVenue &&
          <View>
            <Text>If you own a venue, then this is the place to register your venue(s)</Text>
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
                {venue.verifed?<Text style={{color:'green'}}>Verified</Text>:<Text style={{color:'red'}}>Unverified</Text>}
                <Button title="Calendar" onPress={() => this.navigateToCalendar(venue)} />

              </View>
            )
          })
        }
      </View>
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
    this.props.navigation.navigate('Venues', {user: this.state.user})
  }

  render() {
    let buttonTitle = ''
    if (this.state.user && this.state.user.hasVenue) {
      buttonTitle = "You have "+this.state.user.hasVenue+" venues"
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
            <MyToolBar user={this.state.user} doLogout={this.handleLogout} gotoVenue={this.navigateToVenues} />
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
                <Text>There are {this.state.user.vwants.length} venues accumulating fans</Text>
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
    screen: Home,
  },
  Venues: {
    screen: Venues,
  },
  Calendar: {
    screen: MyCalendar,
    navigationOptions: ({navigation}) => ({
      title: `${navigation.state.params.venue.venueName}`
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
