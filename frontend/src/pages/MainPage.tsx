import { Searching } from '../components/chat/Searching';
import { Chat } from '../components/chat/Chat';
import { useChatStore } from '../store/chatStore';
import { FindMatch } from '../components/chat/FindMatch';

export function MainPage() {
  const state = useChatStore((s) => s.state);

  if (state === 'SEARCHING') {
    return <Searching />;
  }

  if (state === 'CHAT_ACTIVE') {
    return <Chat />;
  }

  return <FindMatch />;
}