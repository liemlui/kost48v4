-- Allow routine work to be started before completion so staff can work one item at a time.
ALTER TYPE "StaffRoutineStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
