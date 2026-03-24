-- Create support_tickets table
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp
);

-- Enable Row Level Security for support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create ticket_messages table
CREATE TABLE ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp
);

-- Enable Row Level Security for ticket_messages
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Create ticket_notes table
CREATE TABLE ticket_notes (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp
);

-- Enable Row Level Security for ticket_notes
ALTER TABLE ticket_notes ENABLE ROW LEVEL SECURITY;