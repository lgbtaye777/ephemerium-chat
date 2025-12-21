export type ScreenType = "landing" | "nickInput" | "waitingPeer" | "chat" | "sessionEnd";

export type MessageKind = "user" | "system";

export interface Message {
  type: MessageKind;
  text: string;
  from?: string;
  isSent?: boolean;
  timestamp?: string;
}

export interface EphemeralState {
  screen: ScreenType;
  nickname: string;
  peerNickname: string;
  sessionId: string;
  messages: Message[];
}
