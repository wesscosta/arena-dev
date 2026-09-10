alter table enrollments
    add column preferred_name varchar(80);

update enrollments e
set preferred_name = nullif(trim(s.nickname), '')
from students s
where e.student_id = s.id
  and s.nickname is not null
  and trim(s.nickname) <> '';
