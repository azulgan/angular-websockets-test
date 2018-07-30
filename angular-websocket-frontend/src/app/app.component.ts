import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AgGridNg2 } from 'ag-grid-angular';
import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';
import $ from 'jquery';
import * as ParseJson from 'jsonify';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('agGrid') private agGrid: AgGridNg2;
  private serverUrl = 'http://localhost:8080/socket'
  private title = 'WebSockets chat';
  private stompClient;

  constructor(private http: HttpClient) {
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

  // ag-grid specifics
    columnDefs = [
        {headerName: 'Make', field: 'make', checkboxSelection: false, editable: true  },
        {headerName: 'Model', field: 'model', editable: true },
        {headerName: 'Price', field: 'price', editable: true }
    ];

    rowData: any;

    ngOnInit() {
        this.rowData = this.http.get('https://api.myjson.com/bins/15psn9');
    }

    getSelectedRows() {
        const selectedNodes = this.agGrid.api.getSelectedNodes();
        const selectedData = selectedNodes.map( node => node.data );
        const selectedDataStringPresentation = selectedData.map( node => node.make + ' ' + node.model).join(', ');
        alert(`Selected nodes: ${selectedDataStringPresentation}`);
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
