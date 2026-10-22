-- v0.12: the teacher may register a student by name or by e-mail, and the
-- student finishes the registration. No e-mail verification in this version:
-- email_source records who typed it, so a later verification step can tell
-- teacher-provided addresses from self-declared ones.
alter table students add column email varchar(254);
alter table students add column email_source varchar(16);
alter table students add column name_pending boolean not null default false;

alter table students add constraint ck_students_email_source
    check ((email is null and email_source is null)
        or (email is not null and email_source in ('TEACHER', 'STUDENT')));

create unique index uk_students_email on students (lower(email)) where email is not null;
