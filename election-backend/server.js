require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');


const app = express();
const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const PORT = Number(process.env.PORT) || 4000;
const ALLOWED_DOMAIN = '@iiitmanipur.ac.in';
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PIN = process.env.ADMIN_PIN;

const CAMPUS_BOUNDARIES = {
  minLat: 24.84232,
  maxLat: 24.84392,
  minLng: 93.93783,
  maxLng: 93.93985,
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'election-candidates',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 400, height: 400, crop: 'fill' }],
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Authorization token required' });
  try {
    req.student = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Admin token required' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ message: 'Admin access only' });
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }
};

const buildStudentIdFromEmail = email => email.split('@')[0].trim().toLowerCase();

app.post('/api/auth/login', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'Google ID token is required' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();
    if (!email?.endsWith(ALLOWED_DOMAIN))
      return res.status(403).json({ message: 'Unauthorized Domain' });
    const studentId = buildStudentIdFromEmail(email);
    const student = await prisma.student.upsert({
      where: { email },
      update: {},
      create: { email, studentId },
    });
    const token = jwt.sign(
      { id: student.id, studentId: student.studentId, email: student.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.status(200).json({ student, token });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({ message: 'Invalid Google token' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ message: 'PIN is required' });
  if (String(pin) !== String(ADMIN_PIN))
    return res.status(403).json({ message: 'Incorrect PIN' });
  const adminToken = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '8h' });
  return res.status(200).json({ adminToken });
});

app.post('/api/admin/election', requireAdminAuth, async (req, res) => {
  const { title, startDate, endDate } = req.body;
  if (!title || !startDate || !endDate)
    return res.status(400).json({ message: 'title, startDate and endDate are required' });
  try {
    const election = await prisma.election.create({
      data: { title, startDate: new Date(startDate), endDate: new Date(endDate), status: 'DRAFT' },
    });
    return res.status(201).json(election);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to create election' });
  }
});

app.get('/api/admin/elections', requireAdminAuth, async (_req, res) => {
  try {
    const elections = await prisma.election.findMany({
      orderBy: { createdAt: 'desc' },
      include: { positions: true, _count: { select: { votes: true, applications: true } } },
    });
    return res.status(200).json(elections);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch elections' });
  }
});

app.patch('/api/admin/election/:id', requireAdminAuth, async (req, res) => {
  const { title, startDate, endDate, status } = req.body;
  const id = Number(req.params.id);
  try {
    const data = {};
    if (title) data.title = title;
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (status) data.status = status;
    const election = await prisma.election.update({ where: { id }, data });
    return res.status(200).json(election);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update election' });
  }
});

app.delete('/api/admin/election/:id', requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.election.delete({ where: { id } });
    return res.status(200).json({ message: 'Election deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to delete election' });
  }
});

app.post('/api/admin/position', requireAdminAuth, async (req, res) => {
  const { electionId, positionName } = req.body;
  if (!electionId || !positionName)
    return res.status(400).json({ message: 'electionId and positionName are required' });
  try {
    const position = await prisma.position.create({
      data: { electionId: Number(electionId), positionName },
    });
    return res.status(201).json(position);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to create position' });
  }
});

app.delete('/api/admin/position/:id', requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.position.delete({ where: { id } });
    return res.status(200).json({ message: 'Position deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to delete position' });
  }
});

app.post('/api/apply', requireAuth, upload.single('photo'), async (req, res) => {
  const { electionId, positionId, name, rollNo } = req.body;
  const studentDbId = req.student.id;
  if (!electionId || !positionId || !name || !rollNo || !req.file)
    return res.status(400).json({ message: 'electionId, positionId, name, rollNo and photo are required' });
  try {
    const photoUrl = req.file.path;
    const application = await prisma.candidateApplication.create({
      data: {
        studentId: studentDbId,
        electionId: Number(electionId),
        positionId: Number(positionId),
        name,
        rollNo,
        photoUrl,
        status: 'PENDING',
      },
    });
    return res.status(201).json(application);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002')
      return res.status(400).json({ message: 'You have already applied for this position' });
    return res.status(500).json({ message: 'Failed to submit application' });
  }
});

app.get('/api/admin/applications', requireAdminAuth, async (req, res) => {
  const { electionId } = req.query;
  try {
    const applications = await prisma.candidateApplication.findMany({
      where: electionId ? { electionId: Number(electionId) } : {},
      include: { position: true, student: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(applications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

app.patch('/api/admin/application/:id', requireAdminAuth, async (req, res) => {
  const { status } = req.body;
  const id = Number(req.params.id);
  if (!['APPROVED', 'REJECTED'].includes(status))
    return res.status(400).json({ message: 'status must be APPROVED or REJECTED' });
  try {
    const application = await prisma.candidateApplication.update({ where: { id }, data: { status } });
    return res.status(200).json(application);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update application' });
  }
});

app.delete('/api/admin/application/:id', requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.candidateApplication.delete({ where: { id } });
    return res.status(200).json({ message: 'Candidate removed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to delete candidate' });
  }
});

app.get('/api/election/current', requireAuth, async (_req, res) => {
  try {
    const election = await prisma.election.findFirst({
      where: {
        status: { in: ['DRAFT', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        positions: {
          include: {
            candidates: { where: { status: 'APPROVED' } },
          },
        },
      },
    });
    if (!election) return res.status(404).json({ message: 'No active election' });
    return res.status(200).json(election);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch election' });
  }
});

app.get('/api/my-applications', requireAuth, async (req, res) => {
  try {
    const applications = await prisma.candidateApplication.findMany({
      where: { studentId: req.student.id },
      include: { position: true, election: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(applications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

app.post('/api/vote', requireAuth, async (req, res) => {
  const { electionId, positionId, candidateId, latitude, longitude } = req.body;
  const studentDbId = req.student.id;
  if (!electionId || !positionId || !candidateId || latitude === undefined || longitude === undefined)
    return res.status(400).json({ message: 'electionId, positionId, candidateId, latitude and longitude are required' });
  const isOnCampus =
    latitude >= CAMPUS_BOUNDARIES.minLat &&
    latitude <= CAMPUS_BOUNDARIES.maxLat &&
    longitude >= CAMPUS_BOUNDARIES.minLng &&
    longitude <= CAMPUS_BOUNDARIES.maxLng;
  if (!isOnCampus)
    return res.status(403).json({ message: 'You must be on campus to vote' });
  try {
    const election = await prisma.election.findUnique({ where: { id: Number(electionId) } });
    if (!election || election.status !== 'ACTIVE')
      return res.status(400).json({ message: 'Election is not active' });
    const now = new Date();
    if (now < election.startDate || now > election.endDate)
      return res.status(400).json({ message: 'Voting window is closed' });
    const candidate = await prisma.candidateApplication.findFirst({
      where: { id: Number(candidateId), positionId: Number(positionId), status: 'APPROVED' },
    });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const existingVote = await prisma.vote.findFirst({
      where: { studentId: studentDbId, positionId: Number(positionId) },
    });
    if (existingVote) return res.status(400).json({ message: 'Already voted for this position' });
    const vote = await prisma.vote.create({
      data: {
        studentId: studentDbId,
        electionId: Number(electionId),
        positionId: Number(positionId),
        candidateId: Number(candidateId),
      },
    });
    return res.status(201).json({ message: 'Vote recorded successfully', vote });
  } catch (error) {
    console.error('Vote error:', error);
    if (error.code === 'P2002') return res.status(400).json({ message: 'Already voted for this position' });
    return res.status(500).json({ message: 'Failed to record vote' });
  }
});

app.get('/api/admin/results', requireAdminAuth, async (req, res) => {
  const { electionId } = req.query;
  try {
    const applications = await prisma.candidateApplication.findMany({
      where: {
        status: 'APPROVED',
        ...(electionId ? { electionId: Number(electionId) } : {}),
      },
      include: { position: true, _count: { select: { votes: true } } },
      orderBy: { positionId: 'asc' },
    });
    const results = applications
      .map(a => ({
        id: a.id,
        name: a.name,
        rollNo: a.rollNo,
        photoUrl: a.photoUrl,
        position: a.position.positionName,
        positionId: a.positionId,
        voteCount: a._count.votes,
      }))
      .sort((a, b) => a.positionId - b.positionId || b.voteCount - a.voteCount);
    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch results' });
  }
});

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));