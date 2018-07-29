package org.guegan.websocket.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * (c) aguegan, 2018
 * User: aguegan
 * Date: 7/18/18
 * Time: 9:02 PM
 */
@Controller
public class WebSocketController {
    private final SimpMessagingTemplate template;

    @Autowired
    public WebSocketController(SimpMessagingTemplate template) {
        this.template = template;
    }

    @MessageMapping("/send/message")
    public void onReceivedMessage(String message) {
        this.template.convertAndSend("/chat", message);
                //new SimpleDateFormat("HH:mm:ss").format(new Date()) + message);
    }
}
