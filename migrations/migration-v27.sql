-- migration-v27: todos table

CREATE TABLE IF NOT EXISTS todos (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  text       text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_select" ON todos FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_superuser());

CREATE POLICY "todos_insert" ON todos FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "todos_delete" ON todos FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_superuser());
