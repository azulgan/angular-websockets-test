import { Component } from '@angular/core';
import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';
import $ from 'jquery';
import * as ParseJson from 'jsonify';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private serverUrl = 'http://localhost:8080/socket'
  private title = 'WebSockets chat';
  private stompClient;

  constructor(){
    this.initializeWebSocketConnection();
  }

  initializeWebSocketConnection(){
    let ws = new SockJS(this.serverUrl);
    this.stompClient = Stomp.over(ws);
    let that = this;
    this.stompClient.connect({}, function(frame) {
      that.stompClient.subscribe("/chat", (message) => {
        if(message.body) {
          console.log(message.body);

          let jsonMessage = ParseJson.parse(message.body);
          console.log(jsonMessage);
          $(".chat").append("<div class='message'><div class='author'>" + jsonMessage.author + "</div>"+jsonMessage.body+"</div>")
        }
      });
    });
  }

  sendMessage(who, message){
    let json = ParseJson.stringify({ author: who, body: message});
    this.stompClient.send("/app/send/message" , {}, json);
    $('#input').val('');
  }

}

 /*
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app works!';
}
   */
