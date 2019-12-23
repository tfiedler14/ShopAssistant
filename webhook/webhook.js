const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

var username = "";
var password = "";
var token = "";

function notEmpty(object) {
  return object !== undefined && object !== null && object !== ''
}

function formatString(array) {
  string = '';
  array.forEach((word, index) => {
    if (index === array.length - 1) {
      string += `and ${word}`
    } else {
      string += `${word}, `
    }
  })
  return string;
}

function formatObject(cart) {
  let objList = cart[0];
  string = '';
  let itemCount = 0;
  let subTotal = 0.0;
  // Object.entries(objList).forEach((obj)=> {
  //   Object.ent
  //   console.log('OBJ', obj);
  //   string += 'id: ' + obj.id + ' Name: ' + obj.name + ' Count: ' + obj.count + ' Price: ' + obj.price + '\n';
  //   itemCount += obj.count;
  //   subTotal += obj.price;
  // })

  string += '\nItem Count: ' + itemCount + ' SubTotal: ' + subTotal;
  

  return string;
}

async function botMessage(message) {
  let request = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-access-token': token
    },
    redirect: 'follow',
    body: JSON.stringify({
      id: 'id',
      isUser: false,
      text: message,
    })
  }

  try {
    const serverRet = await fetch('https://mysqlcs639.cs.wisc.edu/application/messages', request)
    const serverResp = await serverRet.json()
    console.log('botMessageSent', [serverRet.status, serverResp]);
  } catch (error) {
    return
  }
}

async function userMessage(message) {
  let request = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-access-token': token
    },
    redirect: 'follow',
    body: JSON.stringify({
      id: 'id',
      isUser: true,
      text: message,
    })
  }

  try {
    const serverRet = await fetch('https://mysqlcs639.cs.wisc.edu/application/messages', request)
    const serverResp = await serverRet.json()
    console.log('botMessageSent', [serverRet.status, serverResp]);
  } catch (error) {
    return
  }
}

async function getData(endpoint) {
  let request;
  if (notEmpty(token)) {
    request = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow'
    }
  }

  try {
    const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/' + endpoint, request)
    const serverResponse = await serverReturn.json()
    console.log([serverReturn.status, serverResponse]);
    return [serverResponse];
  } catch (error) {
    console.log('getData Error', error);
    return [null, error]
  }
}


async function getToken() {
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + base64.encode(username + ':' + password)
    },
    redirect: 'follow'
  }

  const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/login', request)
  const serverResponse = await serverReturn.json()
  token = serverResponse.token

  return token;
}

app.get('/', (req, res) => res.send('online'))
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res })

  function welcome() {
    agent.add('Webhook works!')
  }

  async function login() {
    // You need to set this from `username` entity that you declare in DialogFlow
    console.log('LoginRequestIntent');
    username = agent.parameters.username;
    // You need to set this from password entity that you declare in DialogFlow
    password = agent.parameters.password;

    if (!notEmpty(username) || !notEmpty(password)) {
      agent.add('I\'m sorry, I could not gather your information. Please try again later');
      return
    }

    token = await getToken()
    console.log("token", token);
    agent.add(token)


    let request = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow',
      body: JSON.stringify({ page: '/' + username })
    }

    try {
      const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application', request)
      const serverResponse = await serverReturn.json()
      agent.add('We\'re logged in baby');
      console.log("login success", [serverReturn.status, serverResponse]);
    } catch (error) {
      return
    }

    let clearChat = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow',
    }
    try {
      const serverRet = await fetch('https://mysqlcs639.cs.wisc.edu/application/messages', clearChat)
      const serverResp = await serverRet.json()

      console.log('chatCleared', [serverRet.status, serverResp]);
    } catch (error) {
      return
    }
    agent.add('Are you in need of assistance?');
    await botMessage('Hello ' + username + ', is there anything I can assist you with?');
    return;
  }

  async function query() {
    console.log('QueryRequestIntent');

    let type = agent.parameters.type;
    let product = agent.parameters.Product;
    let tag = agent.parameters.tag;
    let query = agent.parameters.query;
    let location = agent.parameters.Location;
    let response;

    let botResponses = [
      'Is this what you\'re looking for? ',
      'When you look at the fuzzies, careful you must be. For the fuzzies look back... ',
      'Always pass on what you have learned. ',
      'Patience you must have, my young shopawan. ',
      'Be careful with this information, you will: ',
    ];

    let botIdleResponses = [
      'Let me know if you need anything else.',
      'Is there anything else I can get you at the moment?',
      'Is that all?',
      'Just hollar if you need somethin\'. ',
      'Pass on what you have learned',
    ]

    let index = Math.floor(Math.random() * botResponses.length);

    if(notEmpty(location) && location === 'cart'){

      await userMessage(agent.query);
      response = await getData('/application/products');
      cartItems = response[0];
      agent.add('Here is everything in your cart!')
      await botMessage("Here is everything in your cart!\n" + formatObject(cartItems));
      
    }

    //determine what theyre querying for... categories or products
    if (notEmpty(type) && !notEmpty(product) && query === 'what' && !notEmpty(tag)) {
      //just category and just a query
      response = await getData('/categories');
      categories = response[0].categories;
      //put it in the message
      await userMessage(agent.query);

      let bot = botResponses[index];
      bot += formatString(categories);
      console.log("index", index);

      console.log("botcall", bot);
      agent.add(bot)
      await botMessage(bot);
      if (Math.random() > .5) {
        agent.add(botIdleResponses[index]);
        await botMessage(botIdleResponses[index]);
      }
      return
    } else if (notEmpty(product) && query === 'what') {
      //tag of a category and just a query
      //likely in the form of 'what type of shirts do you have 
      response = await getData('/categories/' + product + '/tags');
      tags = response[0].tags;
      console.log('tags', tags);

      await userMessage(agent.query);

      console.log("index1", index);
      let bot = botResponses[index];
      bot += formatString(tags);

      agent.add(bot);
      await botMessage(bot);
      if (Math.random() > .5) {
        agent.add(botIdleResponses[index]);
        await botMessage(botIdleResponses[index]);
      }
      return;
    } else if (notEmpty(product) && query === 'reviews') {
      //need to validate location....

      //inquire about reviews

    }
  }

  async function navigation() {

    console.log('NavigationRequestIntent');

    let location = agent.parameters.Location;
    let product = agent.parameters.Product;
    let index = agent.parameters.ordinal;

    let current;
    if(!notEmpty(location) && !notEmpty(product) && !notEmpty(index)){
      agent.add('Please be more specific and try again');
     await botMessage('You\'re going to have to be more specific than that');
      return; //fail safe
    }
    let back = false;
    let page = '';
    console.log('index', index);
    console.log('AGENT: ', agent.parameters);

    let request = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow',
    }
    try {
      const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application', request)
      const serverResponse = await serverReturn.json()
      console.log([serverReturn.status, serverResponse]);
      current = serverResponse.page;
    } catch (error) {
      console.log('navigation Error', error);
      return [null, error]
    }


    if (notEmpty(location)) {
      if (location === 'Home') {
        page = '/' + username ;
      } else if (location === 'Back') {
        back = true;
      } else if (location === 'cart') {
        page = '/' + username + '/cart-review';
      }
    }
    if(notEmpty(product)){
      if(notEmpty(index)){
        page= '/' + username + '/' + product + '/' + index;
      } else {
        page= '/' + username + '/' + product;
        console.log(page);
      }
    }
    if(page === ''){
      page = current;
    }

    request = {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow',
      body: JSON.stringify({
        back: back,
          page: page
      })
    }

    console.log('requesting', request);
    let destination = '';
    if(notEmpty(location)){
      destination = location;
    } else if (notEmpty(product)){
      destination = "to " + product;
    }

    try {
      const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application', request)
      const serverResponse = await serverReturn.json()
      console.log([serverReturn.status, serverResponse]);
      agent.add('navigating to '+ destination);
      await botMessage('Navigating ' + destination)
    } catch (error) {
      console.log('navigation Error', error);
      return [null, error]
    }
    
     request = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      redirect: 'follow',
    }
    try {
      const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application', request)
      const serverResponse = await serverReturn.json()
      console.log([serverReturn.status, serverResponse]);
      current = serverResponse.page;
    } catch (error) {
      console.log('navigation Error', error);
      return [null, error]
    }
    return;

  }

  async function search() {
    console.log('SearchRequestIntent');

    let tags = agent.parameters.tag;
    let color = agent.parameters.color;
    let query = agent.parameters.query;

    if(query === 'add'){
      if(notEmpty(tags)){
        request = {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-access-token': token
          },
          redirect: 'follow',
        }
        try {
          const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application/tags/' + tags, request)
          const serverResponse = await serverReturn.json()
          console.log([serverReturn.status, serverResponse]);
        } catch (error) {
          console.log('navigation Error', error);
          return [null, error]
        }
      }
  
        if(notEmpty(color)){
        request = {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-access-token': token
          },
          redirect: 'follow',
        }
        try {
          const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application/tags/' + color, request)
          const serverResponse = await serverReturn.json()
          console.log([serverReturn.status, serverResponse]);
        } catch (error) {
          console.log('navigation Error', error);
          return [null, error]
        }
      }
    } else if (query === 'remove'){
      if(notEmpty(tags)){
        request = {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-access-token': token
          },
          redirect: 'follow',
        }
        try {
          const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application/tags/' + tags, request)
          const serverResponse = await serverReturn.json()
          console.log([serverReturn.status, serverResponse]);
        } catch (error) {
          console.log('navigation Error', error);
          return [null, error]
        }
      }
  
        if(notEmpty(color)){
        request = {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-access-token': token
          },
          redirect: 'follow',
        }
        try {
          const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application/tags/' + color, request)
          const serverResponse = await serverReturn.json()
          console.log([serverReturn.status, serverResponse]);
        } catch (error) {
          console.log('navigation Error', error);
          return [null, error]
        }
      }
    }
    return;

    
  }

  let intentMap = new Map()
  intentMap.set('Welcome', welcome)
  // You will need to declare this `Login` content in DialogFlow to make this work
  intentMap.set('Login', login)
  intentMap.set('Query', query)
  intentMap.set('Navigation', navigation)
  intentMap.set('Search', search);
  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)