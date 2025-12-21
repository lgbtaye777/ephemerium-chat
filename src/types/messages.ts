export interface HelloMessage {
  type: "hello";
  nickname: string;
}

export interface HelloOkMessage {
  type: "hello_ok";
  sessionId: string;
}

export interface WaitingMessage {
  type: "waiting";
  requestId: string;
  targetNickname: string;
  expiresAt: number;
}

export interface IncomingRequestMessage {
  type: "incoming_request";
  requestId: string;
  fromNickname: string;
  expiresAt: number;
}

export interface ConnectMessage {
  type: "connect";
  targetNickname: string;
}

export interface PairedMessage {
  type: "paired";
  peerNickname: string;
  sessionId: string;
}

export interface ChatMessage {
  type: "message";
  text: string;
  from?: string;
  timestamp?: string;
}

export interface SystemMessage {
  type: "system";
  text: string;
  type_: "user_joined" | "user_left" | "connection_established" | "peer_disconnected";
}

export interface SessionEndMessage {
  type: "session_end";
  reason: "peer_disconnected" | "timeout" | "user_leave" | "error";
}

export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
}

export interface LeaveMessage {
  type: "leave";
}

export type WSMessage =
  | HelloMessage
  | HelloOkMessage
  | WaitingMessage
  | IncomingRequestMessage
  | ConnectMessage
  | PairedMessage
  | ChatMessage
  | SystemMessage
  | SessionEndMessage
  | ErrorMessage
  | LeaveMessage;
