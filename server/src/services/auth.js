import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const SALT_ROUNDS = 12;

export async function registerUser({ email, password, displayName, role = 'STUDENT' }) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  let institution = await prisma.institution.findFirst({
    where: { name: config.defaultInstitution }
  });
  if (!institution) {
    institution = await prisma.institution.create({
      data: { name: config.defaultInstitution, region: 'BARMM', type: 'college' }
    });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      role,
      institutionId: institution.id
    },
    select: userSelect
  });

  const token = signToken(user);
  return { user, token };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { institution: true }
  });

  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const token = signToken(user);
  return { user: sanitizeUser(user), token };
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  institutionId: true,
  createdAt: true,
  institution: { select: { id: true, name: true, region: true } }
};

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    institutionId: user.institutionId,
    createdAt: user.createdAt,
    institution: user.institution
  };
}

export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: userSelect
  });
}
