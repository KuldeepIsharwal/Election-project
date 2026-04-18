// Defaulting to a bounding box roughly in the Agartala area. 
// You will need to tighten these coordinates to perfectly match your specific campus rectangle.
const CAMPUS_BOUNDARIES = {
  minLat: 23.8200, // Bottom edge (South)
  maxLat: 23.8500, // Top edge (North)
  minLng: 91.2600, // Left edge (West)
  maxLng: 91.2900  // Right edge (East)
};

const castVote = async (req, res) => {
  const { positionId, candidateId, userLat, userLng } = req.body;
  const voterId = req.user.uid; // Extracted from Firebase auth middleware

  // 1. Verify Location (The Bounding Box)
  const isOnCampus = 
    userLat >= CAMPUS_BOUNDARIES.minLat &&
    userLat <= CAMPUS_BOUNDARIES.maxLat &&
    userLng >= CAMPUS_BOUNDARIES.minLng &&
    userLng <= CAMPUS_BOUNDARIES.maxLng;

  if (!isOnCampus) {
    return res.status(403).json({ error: 'You must be on campus to vote.' });
  }

  // 2. Cast the Vote in PostgreSQL
  try {
    const vote = await req.prisma.vote.create({
      data: {
        voterId,
        candidateId,
        positionId
      }
    });
    res.status(201).json({ message: 'Vote cast successfully!', vote });
  } catch (error) {
    // If the @@unique constraint fails, Prisma throws an error
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'You have already voted for this position.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { castVote };