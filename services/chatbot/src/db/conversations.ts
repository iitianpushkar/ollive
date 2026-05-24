import { getPool, type Conversation, type Message, type MessageRole } from "@ollive/db";

export async function createConversation(
  provider: string,
  model: string,
  title?: string
): Promise<Conversation> {
  const pool = getPool();
  const result = await pool.query<Conversation>(
    `INSERT INTO conversations (title, provider, model)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [title ?? "New conversation", provider, model]
  );
  return result.rows[0];
}

export async function listConversations(limit = 50): Promise<Conversation[]> {
  const pool = getPool();
  const result = await pool.query<Conversation>(
    `SELECT * FROM conversations
     ORDER BY updated_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const pool = getPool();
  const result = await pool.query<Conversation>(
    `SELECT * FROM conversations WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function cancelConversation(id: string): Promise<Conversation | null> {
  const pool = getPool();
  const result = await pool.query<Conversation>(
    `UPDATE conversations SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function touchConversation(id: string): Promise<void> {
  const pool = getPool();
  await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [id]);
}

export async function getMessages(
  conversationId: string,
  limit = 50
): Promise<Message[]> {
  const pool = getPool();
  const result = await pool.query<Message>(
    `SELECT * FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [conversationId, limit]
  );
  return result.rows;
}

export async function getRecentMessages(
  conversationId: string,
  window: number
): Promise<Message[]> {
  const pool = getPool();
  const result = await pool.query<Message>(
    `SELECT * FROM (
       SELECT * FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) sub ORDER BY created_at ASC`,
    [conversationId, window]
  );
  return result.rows;
}

export async function addMessage(
  conversationId: string,
  role: MessageRole,
  content: string
): Promise<Message> {
  const pool = getPool();
  const result = await pool.query<Message>(
    `INSERT INTO messages (conversation_id, role, content)
     VALUES ($1, $2::message_role, $3)
     RETURNING *`,
    [conversationId, role, content]
  );
  await touchConversation(conversationId);
  return result.rows[0];
}
