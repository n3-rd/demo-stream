import { pgTable, uuid, text, boolean, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique(),
  username: text('username').unique(),
  password: text('password'),
  companyName: text('company_name').notNull(),
  companyLogo: text('company_logo'),
  superuser: boolean('superuser').default(false),
  companyAddress: text('company_address'),
  companyWebsite: text('company_website'),
  phone: text('phone'),
  phoneVerified: boolean('phone_verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const viewroomUsers = pgTable('viewroom_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  loginName: text('login_name').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  company: uuid('company').notNull().references(() => users.id),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userEmail: text('user_email').notNull(),
  code: text('code').notNull(),
  phoneNumber: text('phone_number'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false),
  verificationType: text('verification_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const adminPhoneVerification = pgTable('admin_phone_verification', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: text('phone').notNull(),
  verificationCode: text('verification_code').notNull(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false),
  companyName: text('company_name').notNull(),
  password: text('password'),
  website: text('website'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const aiAssistants = pgTable('ai_assistants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  viewroomConnections: text('viewrooom_connections').array(),
  engagements: jsonb('engagements'),
  trainingFiles: text('training_files').array(),
  status: boolean('status').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const contentLibrary = pgTable('content_library', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  file: text('file').notNull(),
  thumbnail: text('thumbnail'),
  ownerCompany: uuid('owner_company').references(() => users.id),
  sharedWith: text('shared_with').array(),
  libraryType: text('library_type').array(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  phone: text('phone').notNull(),
  hours: jsonb('hours').notNull(),
  ownerCompany: uuid('owner_company').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  email: text('email'),
  description: text('description'),
  toCompany: uuid('to_company').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const representatives = pgTable('representatives', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull(),
  phone: text('phone'),
  avatar: text('avatar'),
  company: uuid('company').references(() => users.id),
  isActive: boolean('is_active').default(true),
  schedule: jsonb('schedule'),
  location: uuid('location').references(() => locations.id),
  scheduledMeetings: jsonb('scheduled_meetings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const roomVideos = pgTable('room_videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  representatives: text('representatives').array(),
  name: text('name'),
  phone: text('phone'),
  email: text('email'),
  video: text('video'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const roomVideosDuplicate = pgTable('room_videos_duplicate', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  representatives: text('representatives').array(),
  name: text('name'),
  phone: text('phone'),
  email: text('email'),
  videoRef: text('video_ref'),
  ownerCompany: uuid('owner_company').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerCompany: uuid('owner_company').notNull().references(() => users.id),
  title: text('title').notNull(),
  isActive: boolean('is_active').default(true),
  representative: text('representative').array(),
  hostContent: text('host_content').array(),
  representativeContent: text('representative_content').array(),
  scheduled: boolean('scheduled').default(false),
  scheduleTime: timestamp('schedule_time', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const scheduledRooms = pgTable('scheduled_rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  representative: text('representative').array(),
  hostContent: text('host_content').array(),
  representativeContent: text('representative_content').array(),
  scheduled: boolean('scheduled').default(false),
  scheduleTime: timestamp('schedule_time', { withTimezone: true }),
  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  roomId: text('room_id'),
  additionalInformation: text('additional_information'),
  meetingStatus: text('meeting_status'),
  meetingDuration: integer('meeting_duration'),
  joinBeforeMinutes: integer('join_before_minutes'),
  participantsJoined: jsonb('participants_joined'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const uploadedVideos = pgTable('uploaded_videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  videoUrl: text('video_url'),
  userId: uuid('user_id').references(() => users.id),
  video: text('video'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const videos = pgTable('videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  video: text('video').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}); 