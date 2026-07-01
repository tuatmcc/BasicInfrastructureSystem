export const buildEventDetailHref = (eventMessageId: string) => `/event/${eventMessageId}`;

export const getEventMessageTitle = (content: string) => (
  content.split('\n')[0] || 'イベント通知メッセージ'
);
