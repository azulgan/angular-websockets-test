import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {DOCUMENT} from '@angular/platform-browser';
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
  //private wsPort = 7649;
  private wsPort = 80;

  //private serverUrl = 'http://localhost:7649/socket'
  private serverUrl;
  private title = 'WebSockets chat';
  private stompClient;

  private ROLE_TRADER = "TRADER";
  private ROLE_SALES = "SALES";
  private possibleNamesSales;
  private possibleNamesTrader;

  public myNavigation; // defined in the constructor
  public role = this.ROLE_SALES;

  public columnDefs = null;
  readonly clientId;
  public clientColor;
  private nextId = 3;
  public myNumberFormatter;
  public myPriceFormatter;
  public myName;

  constructor(@Inject(DOCUMENT) private document, private http: HttpClient) {
    if (document.location.port == 4200) {
      console.log("adjusting ws port to 7649 since the current server is :4200");
      this.wsPort = 7649;
    }
    this.possibleNamesSales = [ "Stephane", "Sam", "Sofiane", "Solen" ];
    this.possibleNamesTrader = [ "Tristan", "Thierry", "Tiago", "Tamara" ];
    this.serverUrl = document.location.protocol +'//'+ document.location.hostname +
                    ':' + this.wsPort + '/socket';
    console.log(this.serverUrl);
    this.initializeWebSocketConnection();
    this.calculateColumnDefs();
    this.clientId = this.makeid(10);
    this.clientColor = this.makeColor();
    this.myName = this.makeName();
    this.myNavigation = function myNavigation(params) {
       var previousCell = params.previousCellDef;
       var suggestedNextCell = params.nextCellDef;

       var KEY_UP = 38;
       var KEY_DOWN = 40;
       var KEY_LEFT = 37;
       var KEY_RIGHT = 39;
       var zis = this;
       switch (params.key) {
           case KEY_DOWN:
               previousCell = params.previousCellDef;
               // set selected cell on current cell + 1
// FIXME missing global reference gridOptions
/*
               gridOptions.api.forEachNode( (node) => {
                   if (previousCell.rowIndex + 1 === node.rowIndex) {
                       node.setSelected(true);
                   }
               });
*/
               return suggestedNextCell;
           case KEY_UP:
               previousCell = params.previousCellDef;
               // set selected cell on current cell - 1
// FIXME missing global reference gridOptions
/*
               gridOptions.api.forEachNode( (node) => {
                   if (previousCell.rowIndex - 1 === node.rowIndex) {
                       node.setSelected(true);
                   }
               });
*/
               return suggestedNextCell;
           case KEY_LEFT:
           case KEY_RIGHT:
               return suggestedNextCell;
           default:
               throw "this will never happen, navigation is always on of the 4 keys above";
       }
    };
    this.myNumberFormatter = function(number) {
      let formatted = new Intl.NumberFormat('en-US', { style: 'decimal', useGrouping: true, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number.value);
      //console.log(formatted);
      return formatted;
    };
    this.myPriceFormatter = function(number) {
      let formatted = new Intl.NumberFormat('en-US', { style: 'decimal', useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number.value);
      //console.log(formatted);
      return formatted;
    };
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
            let color = jsonMessage.color;
            $(".chat").append("<div class='message' style='display: block; color: " + color + "'><span class='author'>" + jsonMessage.author + "</span><span class='body'>"+jsonMessage.body+"</span></div><br/>")
          }
          else {
            // array update received
            console.log(jsonMessage);
            let newData = jsonMessage.body;
            let now = Date.now();
            for (let line of newData) {
              line.meChangingLast = (line.clientId === that.clientId);
              // here calculation regarding the field change date... might wait to have proper events sent
              // to finish the line
              //line.
            }
            if (jsonMessage.clientId != this.clientId) {
              that.newData(newData);
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
//    console.log(api.forEachNode);
//    var callback = function(obj) {
//       console.log(obj);
//    }
//    api.forEachNode(callback);
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
    this.switchName();
    this.switchColor();
  }
  assignRole(role) {
    this.role = role;
    this.calculateColumnDefs();
  }

  calculateColumnDefs() {
    let myClassRules = {
            'recent': function(params) {
              let ret = params.data.lastModification != undefined && !params.data.meChangingLast ?
                Date.now() - params.data.lastModification < 5000 : false;
              return ret;
            },
            'lost': function(params) { return params.data.tradedLost == 'Lost'; },
            'traded': function(params) { return params.data.tradedLost == 'Traded'; },
            'trader': function(params) { return params.data.lastModifiedBy == 'TRADER'; },
            'sales': function(params) { return params.data.lastModifiedBy == 'SALES'; },
            'validatedBuddy': function(params) { return params.data.validatedBy != '' && params.data.validatedBy === params.value; },
            'validated' : function(params) {
              let ret = params.data.validatedBy != '' && params.data.validatedBy != params.value;
              //console.log('validatedBy = ' + params.data.validatedBy + '; ' + ret);
              return ret;
            },
          };
    if (this.role == this.ROLE_TRADER) {
      this.columnDefs = [
          {headerName: 'Direction', field: 'direction', checkboxSelection: true, editable: false, cellClassRules: myClassRules, width: 90 },
          {headerName: 'ISIN', field: 'isin', editable: false, cellClassRules: myClassRules, width: 100 },
          {headerName: 'Nominal (M)', field: 'nominal', editable: false, cellClass: 'grid-right-align',
              cellClassRules: myClassRules, valueFormatter: this.myNumberFormatter, width: 100 },
          {headerName: 'Start Date', field: 'startDate', editable: false, cellClassRules: myClassRules, width: 90 },
          {headerName: 'End Date', field: 'endDate', editable: false, cellClassRules: myClassRules, width: 90 },
          {headerName: 'Rate (%)', field: 'rate', editable: true, cellClass: 'grid-right-align', cellClassRules: myClassRules,
              width: 120 },
          {headerName: 'All in Price (%)', field: 'allInPrice', editable: true, cellClass: 'grid-right-align',
              cellClassRules: myClassRules, valueFormatter: this.myPriceFormatter, width: 120 },
          {headerName: 'HairCut (%)', field: 'hairCut', editable: true, cellClass: 'grid-right-align',
              cellClassRules: myClassRules, valueFormatter: this.myPriceFormatter, width: 120 },
          {headerName: 'Call P. (d)', field: 'callPeriod', editable: true, cellClass: 'grid-right-align', cellClassRules: myClassRules,
              valueFormatter: this.myNumberFormatter, width: 120 },
          {headerName: 'Substituable', field: 'substituable', editable: true, cellClassRules: myClassRules,
              width: 80 },
          {headerName: 'Cash CCY', field: 'cashCCY', editable: true, cellClassRules: myClassRules, width: 60,
              cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['EUR', 'USD', 'JPY', 'GBP' ] }, },
          {headerName: 'Traded/Lost', field: 'tradedLost', editable: false, cellClassRules: myClassRules, width: 80,
              cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['-', 'Traded', 'Lost' ] }, },
          {headerName: 'Buddy', field: 'lastSales', editable: false, cellClassRules: myClassRules, width: 100 },
      ];
    }
    else {
      this.columnDefs = [
          {headerName: 'Direction', field: 'direction', checkboxSelection: true, editable: true, cellClassRules: myClassRules,
             cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Borrow Sec', 'Lend Sec' ] }, width: 120 },
          {headerName: 'ISIN', field: 'isin', editable: true, cellClassRules: myClassRules, width: 120 },
          {headerName: 'Nominal (M)', field: 'nominal', editable: true, cellClass: 'grid-right-align', cellClassRules: myClassRules,
              valueFormatter: this.myNumberFormatter, width: 100 },
          {headerName: 'Start Date', field: 'startDate', editable: true, cellClassRules: myClassRules, width: 100 },
          {headerName: 'End Date', field: 'endDate', editable: true, cellClassRules: myClassRules, width: 100 },
          {headerName: 'Rate (%)', field: 'rate', editable: false, cellClass: 'grid-right-align', cellClassRules: myClassRules,
              width: 120 },
          {headerName: 'All in Price (%)', field: 'allInPrice', editable: false, cellClass: 'grid-right-align', cellClassRules: myClassRules,
              valueFormatter: this.myPriceFormatter, width: 120 },
          {headerName: 'Hair Cut (%)', field: 'hairCut', editable: false, cellClass: 'grid-right-align', cellClassRules: myClassRules,
              valueFormatter: this.myPriceFormatter, width: 120 },
          {headerName: 'Call P. (d)', field: 'callPeriod', editable: false, cellClass: 'grid-right-align', cellClassRules: myClassRules,
              valueFormatter: this.myNumberFormatter, width: 90 },
          {headerName: 'Substituable', field: 'substituable', editable: false, cellClassRules: myClassRules,
              width: 80 },
          {headerName: 'Cash CCY', field: 'cashCCY', editable: false, cellClassRules: myClassRules, width: 60 },
          {headerName: 'Traded/Lost', field: 'tradedLost', editable: false, cellClassRules: myClassRules, width: 80 },
          {headerName: 'Buddy', field: 'lastTrader', editable: false, cellClassRules: myClassRules, width: 100 },
      ];
      // todo add handler to remove the price if isin or nominal are modified. And also ignore responses from server if changed since request
    }
  }

  isReturn(event) {
    if (event.key != "Enter") {
        return false;
    }
    return true;
  }

  sendMessage(who, message){
    let json = ParseJson.stringify({ author: who, isUpdate: false, body: message, color: this.clientColor });
    this.stompClient.send("/app/send/message" , {}, json);
    $('#input').val('');
  }
  sendUpdate(who, allData, rowIndex, columnName) {
    console.log("Sending update relative to " + rowIndex);
    allData[rowIndex].clientId = this.clientId;
    if (rowIndex != undefined) {
      allData[rowIndex].lastModification = Date.now();
    }
    let json = ParseJson.stringify({ author: who, clientId: this.clientId, isUpdate: true, body: allData, rowIndex: rowIndex, columnName: columnName });
    this.stompClient.send("/app/send/message", {}, json);
  }

  // ag-grid specifics

  rowData: any;

  ngOnInit() {
    this.calculateColumnDefs();
    this.rowData = //this.http.get('https://api.myjson.com/bins/15psn9');
      [{"id":1,"direction": "Borrow Sec", "isin":"FR0000000010","nominal":"1234","startDate":"2018-09-10","endDate":"2018-10-10",
          "rate":"3.55", "allInPrice": 2.5, "hairCut": 5, "callPeriod": 30, "substituable": 'Y', "cashCCY": "USD",
          "tradedLost": "-", "lastModifiedBy":this.ROLE_SALES, "validatedBy": "", "lastSales": "Simon"},
       {"id":2,"direction": "Lend Sec", "isin":"LU0000000011","nominal":"2","startDate":"2018-09-11","endDate":"2018-12-10",
          "rate":"OBF - 1.2","allInPrice": 0.3,"hairCut": 4,"callPeriod": 1,"substituable": "N", "cashCCY": "EUR", "tradedLost": "Lost", "lastModifiedBy":"TRADER",
          "validatedBy": "", "lastSales": "Soria" }];
  }

    getSelectedRows() {
        const selectedNodes = this.agGrid.api.getSelectedNodes();
        const selectedData = selectedNodes.map( node => node.data );
        const selectedDataStringPresentation = selectedData.map( node => node.isin + ' ' + node.nominal + ' ' + node.price).join(', ');
        alert(`Selected nodes: ${selectedDataStringPresentation}`);
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
      newData[newData.length]={ "id": this.nextId, "isin": "", nominal: "0.0", "price": "N/R", "lastModifiedBy": this.role,
        "rate": "-", "allInPrice": "0", "hairCut": "0", "callPeriod": "30",
        "tradedLost": "-"};
      this.nextId++;
      this.newData(newData);
      //alert( this.rowData + "," + this.rowData.length);
      this.selectAllRowsAfter(newRow);
      this.sendUpdate(this.role, newData, undefined, undefined);
    }

    duplicateRow() {
      var api = this.agGrid.api;
      const selectedNodes = api.getSelectedNodes();
      const selectedData = selectedNodes.map( node => node.data );
      var newData = this.rowData;
      const newRow = newData.length;
      for (let entry of selectedData) {
        let newEntry = { ...entry };
        newEntry.id = this.nextId;
        this.nextId++;
        newEntry.lastModifiedBy = this.role;
        if (this.role === this.ROLE_SALES) {
          newEntry.lastSales = this.myName;
        }
        newEntry.validatedBy = '';
        newData[newData.length] = newEntry;
      }
      this.newData(newData);
      this.selectAllRowsAfter(newRow);
      this.sendUpdate(this.role, newData, undefined, undefined);
    }

    newData(data) {
      var api = this.agGrid.api;
      this.rowData = data;
      api.setRowData(data);
    }

    // disabling the real delete, just switchin to 'Lost' state
    completelyDeleteSelectedRows() {
      var api = this.agGrid.api;
      const rows = api.getSelectedRows();
      var data = this.rowData;
      var removeValFromIndex = [];
      rows.forEach((selectedRow, index) => {
        removeValFromIndex[removeValFromIndex.length] = selectedRow.id;
      });
      this.removeFromArray(data, removeValFromIndex);
      this.sendUpdate(this.role, data, undefined, undefined);
    }
    deleteSelectedRows() {
      var api = this.agGrid.api;
      const rows = api.getSelectedRows();
      const selectedData = rows.map( node => node.data );
      for (let entry of rows) {
        entry.tradedLost = 'Lost';
      }
      this.sendUpdate(this.role, this.rowData, undefined, undefined);
    }
    validateSelectedRows() {
      var api = this.agGrid.api;
      const rows = api.getSelectedRows();
      const selectedData = rows.map( node => node.data );
     for (let entry of rows) {
        entry.validatedBy = this.myName;
        entry.lastTrader = this.myName;
        entry.lastModifiedBy = this.ROLE_TRADER;
      }
      this.newData(this.rowData);
      this.sendUpdate(this.role, this.rowData, undefined, undefined);
    }
    executeSelectedRows() {
      var api = this.agGrid.api;
      const rows = api.getSelectedRows();
      const selectedData = rows.map( node => node.data );
      let updateOccured = false;
      for (let entry of rows) {
        if (entry.validatedBy != '') {
          entry.tradedLost = 'Traded';
          updateOccured = true;
        }
        else {
          alert("This trade is not yet validated by the trader");
        }
      }
      if (updateOccured) {
        this.newData(this.rowData);
        this.sendUpdate(this.role, this.rowData, undefined, undefined);
      }
    }
    oldExecuteSelectedRows() {
      var api = this.agGrid.api;
      const rows = api.getSelectedRows();
      var data = this.rowData;
      var removeValFromIndex = [];
      var removedLinesData = [];
      rows.forEach((selectedRow, index) => {
        let line = selectedRow;
        if (line.lastModifiedBy === this.ROLE_TRADER) {
          removeValFromIndex[removeValFromIndex.length] = selectedRow.id;
          removedLinesData[removedLinesData.length] = line.isin + "/" + line.nominal + "/" + line.startDate + "/" + line.price + "\n";
        }
        else {
          removedLinesData[removedLinesData.length] = "Can't select line " + index + ", not validated by trader" + "\n";
        }
      });
      this.removeFromArray(data, removeValFromIndex);
      alert("Execution requested for " + removedLinesData);
      this.newData(data);
      this.sendUpdate(this.role, data, undefined, undefined);
    }

    onCellValueChanged(event) {
      console.log(event);
      //console.log(this.rowData);
      let row = this.rowData[event.rowIndex]
      row.lastModifiedBy = this.role;
      row.validatedBy = '';
      if (this.role === this.ROLE_TRADER) {
        row.lastTrader = this.myName;
      }
      else {
        row.lastSales = this.myName;
      }
      this.newData(this.rowData);
      this.sendUpdate(this.role, this.rowData, event.rowIndex, event.colId);
    }
    removeFromArray(array, ids) {
      var ascOrderedIndexArray = [];
      for (var i = 0; i < array.length; i++) {
        if (ids.indexOf(array[i].id) > -1) {
          ascOrderedIndexArray[ascOrderedIndexArray.length] = i;
        }
      }
      this.technicalRemoveFromArray(array, ascOrderedIndexArray);
    }

    // taken from stack overflow... TODO unit test me !
    technicalRemoveFromArray(array, ascOrderedIndexArray) {
      for (var i = ascOrderedIndexArray.length -1; i >= 0; i--) {
        array.splice(ascOrderedIndexArray[i],1);
      }
    }

    // same
    makeRandom(length, possible) {
      var text = "";
      for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
    }
    makeid(length) {
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      return this.makeRandom(length, possible);
    }
    makeColor() {
      var possible = "ABCDEF0123456789";
      return "#" + this.makeRandom(6, possible);
    }
    makeRandomName(list) {
      return list[Math.floor(Math.random() * list.length)];
    }
    makeName() {
      return this.makeRandomName(this.role === this.ROLE_TRADER ? this.possibleNamesTrader : this.possibleNamesSales);
    }
    switchColor() {
      this.clientColor = this.makeColor();
    }
    switchName() {
      this.myName = this.makeName();
    }
}
