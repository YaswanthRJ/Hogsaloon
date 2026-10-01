import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useGameStore } from '../../store/gameStore';
import { GamePanel } from '../games/GamePanel';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

export function ChatContent() {
  const activeGame = useGameStore((state) => state.activeGame);
  const user = useAuthStore((state) => state.user);
  const messages = useChatStore((state) => state.messages);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {activeGame ? (
        <GamePanel />
      ) : (
        <>
          <MessageList messages={messages} userId={user?._id} />
          <ChatInput />
        </>
      )}
    </div>
  );
}