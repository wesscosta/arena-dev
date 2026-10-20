-- v0.11.0-rc.6: the teacher can stop students from copying a Journey's or a
-- material's content in the student reader. Content is protected when either
-- the Journey or the linked material has it on. Off by default.
alter table journeys add column copy_protected boolean not null default false;
alter table learning_resources add column copy_protected boolean not null default false;
