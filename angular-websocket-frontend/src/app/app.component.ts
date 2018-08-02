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

  private ROLE_TRADER = "TRADER";
  private ROLE_SALES = "SALES";

  private role = this.ROLE_SALES;

  private columnDefs = null;
  private clientId;

  constructor(private http: HttpClient) {
    this.initializeWebSocketConnection();
    this.calculateColumnDefs();
    this.clientId = this.makeid(10);
  }

  initializeWebSocketConnection(){
    let ws = new SockJS(this.serverUrl);
    this.stompClient = Stomp.over(ws);
    let that = this;
    this.stompClient.connect({}, function(frame) {
      that.stompClient.subscribe("/chat", (message) => {
        if(message.body) {
          //console.log(message.body);
          let jsonMessage = ParseJson.parse(message.body);
          if (jsonMessage.isUpdate == undefined || !jsonMessage.isUpdate) {
            $(".chat").append("<div class='message'><span class='author'>" + jsonMessage.author + "</span><span class='body'>"+jsonMessage.body+"</span></div>")
          }
          else {
            // array update received
            console.log(jsonMessage);
            if (jsonMessage.clientId != this.clientId) {
              that.newData(jsonMessage.body);
              if (jsonMessage.rowIndex != undefined && jsonMessage.columnName != undefined) {
                this.hilightValues(jsonMessage.rowIndex, jsonMessage.columnName);
              }
            }
          }
        }
      });
    });
  }

  hilightValues(rowIndex, columnName) {
    const api = this.agGrid.api;
    // todo: change the cell styling in a temporary way
  }

  switchRole() {
    if (this.role == this.ROLE_TRADER) {
      this.role = this.ROLE_SALES;
    }
    else {
      this.role = this.ROLE_TRADER;
    }
    this.calculateColumnDefs();
  }
  assignRole(role) {
    this.role = role;
    this.calculateColumnDefs();
  }

  calculateColumnDefs() {
    if (this.role == this.ROLE_TRADER) {
      this.columnDefs = [
          {headerName: 'ISIN', field: 'isin', checkboxSelection: false, editable: false  },
          {headerName: 'Quantity', field: 'quantity', editable: false },
          {headerName: 'Price', field: 'price', editable: true }
      ];
    }
    else {
      this.columnDefs = [
          {headerName: 'ISIN', field: 'isin', checkboxSelection: true, editable: true },
          {headerName: 'Quantity', field: 'quantity', editable: true },
          {headerName: 'Price', field: 'price', editable: false }
      ];
      // todo add handler to remove the price if isin or quantity are modified. And also ignore responses from server if changed since request
    }
  }

  sendMessage(who, message){
    let json = ParseJson.stringify({ author: who, isUpdate: false, body: message});
    this.stompClient.send("/app/send/message" , {}, json);
    $('#input').val('');
  }
  sendUpdate(who, allData, rowIndex, columnName) {
    let json = ParseJson.stringify({ author: who, clientId: this.clientId, isUpdate: true, body: allData, rowIndex: rowIndex, columnName: columnName });
    this.stompClient.send("/app/send/message", {}, json);
  }

  // ag-grid specifics

  rowData: any;

  ngOnInit() {
    this.calculateColumnDefs();
    this.rowData = //this.http.get('https://api.myjson.com/bins/15psn9');
      [{"isin":"FR0000000010","quantity":"12","price":35000},
       {"isin":"LU0000000011","quantity":"2","price":32000}];
  }

    getSelectedRows() {
        const selectedNodes = this.agGrid.api.getSelectedNodes();
        const selectedData = selectedNodes.map( node => node.data );
        const selectedDataStringPresentation = selectedData.map( node => node.isin + ' ' + node.quantity + ' ' + node.price).join(', ');
        alert(`Selected nodes: ${selectedDataStringPresentation}`);
    }


    myNavigation(params) {
       var previousCell = params.previousCellDef;
       var suggestedNextCell = params.nextCellDef;

       var KEY_UP = 38;
       var KEY_DOWN = 40;
       var KEY_LEFT = 37;
       var KEY_RIGHT = 39;

       switch (params.key) {
           case KEY_DOWN:
               previousCell = params.previousCellDef;
               // set selected cell on current cell + 1
               this.agGrid.api.forEachNode( (node) => {
                   if (previousCell.rowIndex + 1 === node.rowIndex) {
                       node.setSelected(true);
                   }
               });
               return suggestedNextCell;
           case KEY_UP:
               previousCell = params.previousCellDef;
               // set selected cell on current cell - 1
               this.agGrid.api.forEachNode( (node) => {
                   if (previousCell.rowIndex - 1 === node.rowIndex) {
                       node.setSelected(true);
                   }
               });
               return suggestedNextCell;
           case KEY_LEFT:
           case KEY_RIGHT:
               return suggestedNextCell;
           default:
               throw "this will never happen, navigation is always on of the 4 keys above";
       }
    }

    selectAllRowsAfter(line) {
      var api = this.agGrid.api;
      api.deselectAll();
      api.forEachNode( (node) => {
        if (line <= node.rowIndex) {
          node.setSelected(true);
        }
      });
    }

    addEmptyRow() {
      var api = this.agGrid.api;
      var newData = this.rowData;
      const newRow = newData.length;
      newData[newData.length]={ "isin": "", quantity: "0.0", "price": "N/R"};
      this.newData(newData);
      //alert( this.rowData + "," + this.rowData.length);
      this.selectAllRowsAfter(newRow);
      this.sendUpdate(this.role, newData);
    }

    duplicateRow() {
      var api = this.agGrid.api;
      const selectedNodes = api.getSelectedNodes();
      const selectedData = selectedNodes.map( node => node.data );
      var newData = this.rowData;
      const newRow = newData.length;
      for (let entry of selectedData) {
        newData[newData.length] = entry;
      }
      this.newData(newData);
      this.selectAllRowsAfter(newRow);
      this.sendUpdate(this.role, newData);
    }

    newData(data) {
      var api = this.agGrid.api;
      this.rowData = data;
      api.setRowData(data);
    }

    deleteSelectedRows() {
      var api = this.agGrid.api;
      const rows = api.getSelectedRows();
      var data = this.rowData;
      var removeValFromIndex = [];
      rows.forEach((selectedRow, index) => {
        removeValFromIndex[removeValFromIndex.length] = index;
      });
      this.removeFromArray(data, removeValFromIndex);
      this.newData(data);
      this.sendUpdate(this.role, data);
    }
    onCellValueChanged(event) {
      //console.log(event);
      //console.log(this.rowData);
      this.sendUpdate(this.role, this.rowData, undefined, undefined);
    }

    // taken from stack overflow... TODO junit me !
    removeFromArray(array, ascOrderedIndexArray) {
      for (var i = ascOrderedIndexArray.length -1; i >= 0; i--) {
        array.splice(ascOrderedIndexArray[i],1);
      }
    }

    // same
    makeid(length) {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
    }
}
