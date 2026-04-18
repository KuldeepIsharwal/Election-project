require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const PORT = Number(process.env.PORT) || 4000;
const ALLOWED_DOMAIN = '@iiitmanipur.ac.in';

app.use(cors());
app.use(express.json());

const buildStudentIdFromEmail = email => {
  return email.split('@')[0].trim().toLowerCase();
};

app.post('/api/auth/login', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID token is required' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();

    if (!email || !email.endsWith(ALLOWED_DOMAIN)) {
      return res.status(403).json({ message: 'Unauthorized Domain' });
    }

    const studentId = buildStudentIdFromEmail(email);

    const student = await prisma.student.upsert({
      where: { email },
      update: {},
      create: {
        email,
        studentId,
      },
    });

    return res.status(200).json(student);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({ message: 'Invalid Google token' });
  }
});

app.get('/api/candidates', async (_req, res) => {
  try {
    const candidates = await prisma.candidate.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    return res.status(200).json(candidates);
  } catch (error) {
    console.error('Fetch candidates error:', error);
    return res.status(500).json({ message: 'Failed to fetch candidates' });
  }
});

app.get('/api/admin/results', async (_req, res) => {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        _count: {
          select: {
            votes: true,
          },
        },
      },
    });

    const results = candidates.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      position: candidate.position,
      description: candidate.description,
      voteCount: candidate._count.votes,
    }))
    .sort((left, right) => {
      if (right.voteCount !== left.voteCount) {
        return right.voteCount - left.voteCount;
      }

      return left.name.localeCompare(right.name);
    });

    return res.status(200).json(results);
  } catch (error) {
    console.error('Fetch admin results error:', error);
    return res.status(500).json({ message: 'Failed to fetch admin results' });
  }
});

app.post('/api/vote', async (req, res) => {
  const { studentId, candidateId } = req.body;

  if (!studentId || !candidateId) {
    return res.status(400).json({ message: 'studentId and candidateId are required' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { studentId: String(studentId).trim().toLowerCase() },
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(candidateId) },
    });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (student.hasVoted) {
      return res.status(400).json({ message: 'Already voted' });
    }

    const result = await prisma.$transaction(async tx => {
      const vote = await tx.vote.create({
        data: {
          studentId: student.id,
          candidateId: candidate.id,
        },
        include: {
          candidate: true,
        },
      });

      const updatedStudent = await tx.student.update({
        where: { id: student.id },
        data: { hasVoted: true },
      });

      return { vote, student: updatedStudent };
    });

    return res.status(201).json({
      message: 'Vote recorded successfully',
      vote: result.vote,
      student: result.student,
    });
  } catch (error) {
    console.error('Vote error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Already voted' });
    }

    return res.status(500).json({ message: 'Failed to record vote' });
  }
});

app.get('/health', (_req, res) => {
  return res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
