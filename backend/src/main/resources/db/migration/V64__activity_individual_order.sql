-- Ordem individual por tentativa: alternativas (e, opcionalmente, questões)
-- embaralhadas para cada aluno. Atividades existentes ficam desligadas.
alter table activities add column individual_option_order boolean not null default false;
alter table activities add column individual_question_order boolean not null default false;
