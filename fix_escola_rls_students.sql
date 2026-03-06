-- Ajustando a política de INSERT para perfil ESCOLA na tabela students
-- Permite que usuários com perfil 'ESCOLA' insiram alunos vinculados à sua escola (via INEP)
DROP POLICY IF EXISTS "escola_insert_students" ON public.students;
CREATE POLICY "escola_insert_students" ON public.students
FOR INSERT 
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role::text <> 'ESCOLA'::text
  )) OR
  (EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.schools s ON s.inep = p.school_inep
    WHERE p.id = auth.uid() 
      AND p.role::text = 'ESCOLA' 
      AND (students.school_id = s.id OR students.school_id IS NULL)
  ))
);

-- Ajustando a política de UPDATE para perfil ESCOLA na tabela students
DROP POLICY IF EXISTS "escola_update_students" ON public.students;
CREATE POLICY "escola_update_students" ON public.students
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role::text <> 'ESCOLA'::text
  )) OR
  (EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.schools s ON s.inep = p.school_inep
    WHERE p.id = auth.uid() 
      AND p.role::text = 'ESCOLA' 
      AND students.school_id = s.id
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role::text <> 'ESCOLA'::text
  )) OR
  (EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.schools s ON s.inep = p.school_inep
    WHERE p.id = auth.uid() 
      AND p.role::text = 'ESCOLA' 
      AND (students.school_id = s.id OR students.school_id IS NULL)
  ))
);
