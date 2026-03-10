/* this is file that exports business logic constants for our backend */

export const PET_PER_USER_LIMIT = 10;

export const APPOINTMENT_PER_USER_LIMIT = 5;

export const CANCEL_APPOINTMENT_TIME_LIMIT = 24; /* in hours */

export const SCHEDULE_MAXIMUM_DATE = 3 /* in months */

export const SERVICE_DURATION = {
    CONSULTATION: 20,
    VACCINATION: 10,
    EXAM: 30,
    CHECKUP: 20,
    BATH_GROOMING: 60
};