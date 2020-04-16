#include <SPI.h>
#include <Ethernet.h>

#define maxLength_webHeaderFromClient 100
// Response text
char WEB_CONTENT_TYPE[] = "\nContent-Type: ";
char WEB_CONNECTION_CLOSE[] = "\nConnection: close";
char WEB_KEEP_ALIVE[] = "\nConnection: keep-alive";
char WEB_SERVERNAME[] = "\nServer: SICURA";
char WEB_RESP_CLOSE[] = "\n\n";
// Response code
char WEB_HTTP_RESP_200[] = "HTTP/1.1 200 OK";
char WEB_HTTP_RESP_204[] = "HTTP/1.1 204 NO CONTENT";
char WEB_HTTP_RESP_303[] = "HTTP/1.1 303 See Other";
char WEB_HTTP_RESP_400[] = "HTTP/1.1 400 Bad Request";
char WEB_HTTP_RESP_401[] = "HTTP/1.1 401 Authorization Required";
char WEB_HTTP_RESP_404[] = "HTTP/1.1 404 File Not Found";
char WEB_HTTP_RESP_404_CONTENT[] = "<!DOCTYPE html><html><head><title>SICURA Web Page 404</title></head><body><h1>404 Error Page not Found</h1></body></html>";
char WEB_HTTP_RESP_500[] = "HTTP/1.1 500 Internal Server Error";
// Type of file
char WEB_TYPE_HTML[] = "text/html";
char WEB_TYPE_TEXT[] = "plain/text";
char WEB_TYPE_JSON[] = "application/json";

byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
IPAddress ip(10, 0, 0, 100);

bool stat = false;
String pass = "12345";

// Initialize the Ethernet server library
// with the IP address and port you want to use
// (port 80 is default for HTTP):
EthernetServer server(80);

void setup() {
  // Open serial communications and wait for port to open:
  Serial.begin(9600);
  while (!Serial) {
    ; // wait for serial port to connect. Needed for Leonardo only
  }

  Ethernet.begin(mac, ip);
  // give the Ethernet shield a second to initialize:
  delay(1000);

  server.begin();
  Serial.print("server is at ");
  Serial.println(Ethernet.localIP());
}

void loop() {
  // listen for incoming clients
  EthernetClient client = server.available();
  if (client) {
    Serial.println("new client");
    // an http request ends with a blank line
    boolean currentLineIsBlank = true;
    String inString = "";
    while (client.connected()) {
      if (client.available()) {
        char c = client.read();
        if (inString.length() < maxLength_webHeaderFromClient) {
          inString += c;
        }
        //Serial.write(c);
        // if you've gotten to the end of the line (received a newline
        // character) and the line is blank, the http request has ended,
        // so you can send a reply
        if (c == '\n' && currentLineIsBlank) {
          if (inString.indexOf("status") > -1) {
            int ind1 = inString.indexOf("&auth=") + 6;
            int ind2 = inString.indexOf(" HTTP/1.1");
            String Auth = inString.substring(ind1, ind2);
            if (Auth == pass) {
              SendHTTPResponse(client, 200, WEB_TYPE_JSON, true);
              client.print("{\"status\":\"");
              client.print((stat == true ? "enabled" : "disabled"));
              client.println("\"}");
            } else {
              SendHTTPResponse(client, 400, WEB_TYPE_HTML, false);
            }
          } else if (inString.indexOf("enable") > -1) {
            if (inString.indexOf(" /") > -1) {
              int ind1 = inString.indexOf("?") + 1;
              int ind2 = inString.indexOf("=");
              //Serial.println(inString.substring(ind1, ind2));
              if (String(inString.substring(ind1, ind2)) == "enable") {
                ind1 = inString.indexOf("=") + 1;
                ind2 = inString.indexOf("&");
                long DisableTime_inSec = inString.substring(ind1, ind2).toInt();
                ind1 = inString.indexOf("&auth=") + 6;
                ind2 = inString.indexOf(" HTTP/1.1");
                String Auth = inString.substring(ind1, ind2);
                if (Auth == pass) {
                  SendHTTPResponse(client, 200, WEB_TYPE_JSON, true);
                  stat = true;
                  client.println("{\"status\":\"enabled\",\"time\":\"" + String(DisableTime_inSec) + "\"}");
                } else {
                  SendHTTPResponse(client, 400, WEB_TYPE_HTML, false);
                }
              } else {
                SendHTTPResponse(client, 400, WEB_TYPE_HTML, false);
              }
            } else {
              SendHTTPResponse(client, 400, WEB_TYPE_HTML, false);
            }
          } else if (inString.indexOf("disable") > -1) {
            if (inString.indexOf(" /") > -1) {
              int ind1 = inString.indexOf("?") + 1;
              int ind2 = inString.indexOf("=");
              //Serial.println(inString.substring(ind1, ind2));
              if (String(inString.substring(ind1, ind2)) == "disable") {
                ind1 = inString.indexOf("=") + 1;
                ind2 = inString.indexOf("&");
                long DisableTime_inSec = inString.substring(ind1, ind2).toInt();
                ind1 = inString.indexOf("&auth=") + 6;
                ind2 = inString.indexOf(" HTTP/1.1");
                String Auth = inString.substring(ind1, ind2);
                if (Auth == pass) {
                  SendHTTPResponse(client, 200, WEB_TYPE_JSON, true);
                  stat = false;
                  client.println("{\"status\":\"dasabled\",\"time\":\"" + String(DisableTime_inSec) + "\"}");
                } else {
                  SendHTTPResponse(client, 400, WEB_TYPE_HTML, false);
                }
              } else {
                SendHTTPResponse(client, 400, WEB_TYPE_HTML, false);
              }
            } else {
              SendHTTPResponse(client, 400, WEB_TYPE_HTML, false);
            }
          } else {
            SendHTTPResponse(client, 400, WEB_TYPE_HTML, false);
          }
          break;
        }
        if (c == '\n') {
          // you're starting a new line
          currentLineIsBlank = true;
        }
        else if (c != '\r') {
          // you've gotten a character on the current line
          currentLineIsBlank = false;
        }
      }
    }
    // give the web browser time to receive the data
    delay(1);
    // close the connection:
    client.stop();
    Serial.println("client disconnected");
  }
}

// Invia HTTP Response
void SendHTTPResponse(EthernetClient cl, int IDResp, char Type[], boolean KeepAlive)
{
  char HTTPResponse[256] = "";

  switch (IDResp) {
    case 200:
      sprintf(HTTPResponse, "%s%s%s", WEB_HTTP_RESP_200, WEB_CONTENT_TYPE, Type);
      break;
    case 204:
      sprintf(HTTPResponse, "%s%s", HTTPResponse, WEB_HTTP_RESP_204);
      break;
    case 303:
      sprintf(HTTPResponse, "%s%s", HTTPResponse, WEB_HTTP_RESP_303);
      break;
    case 400:
      sprintf(HTTPResponse, "%s%s", HTTPResponse, WEB_HTTP_RESP_400);
      break;
    case 401:
      sprintf(HTTPResponse, "%s%s", HTTPResponse, WEB_HTTP_RESP_401);
      break;
    case 404:
      sprintf(HTTPResponse, "%s%s%s%s%s", WEB_HTTP_RESP_404, WEB_CONTENT_TYPE, WEB_TYPE_HTML, WEB_CONNECTION_CLOSE, WEB_HTTP_RESP_404_CONTENT);
      break;
    case 500:
      sprintf(HTTPResponse, "%s%s", HTTPResponse, WEB_HTTP_RESP_500);
      break;
    default:
      sprintf(HTTPResponse, "%s%s", HTTPResponse, WEB_HTTP_RESP_400);
      break;
  }

  sprintf(HTTPResponse, "%s%s", HTTPResponse, WEB_SERVERNAME);
  if (KeepAlive) {
    sprintf(HTTPResponse, "%s%s", HTTPResponse, WEB_KEEP_ALIVE);
  }
  sprintf(HTTPResponse, "%s%s", HTTPResponse, WEB_RESP_CLOSE);
  cl.write(HTTPResponse);
}
