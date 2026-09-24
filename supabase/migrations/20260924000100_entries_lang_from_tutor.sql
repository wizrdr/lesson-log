update lesson_log.entries e
set lang = t.language
from lesson_log.lessons l
join lesson_log.tutors t on t.id = l.tutor_id
where e.lesson_id = l.id and e.lang is null;
