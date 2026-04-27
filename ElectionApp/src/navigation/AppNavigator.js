app.patch('/api/admin/election/:id', requireAdminAuth, async (req, res) => {
  const { title, startDate, endDate, status, resultsPublished } = req.body;
  const id = Number(req.params.id);
  try {
    const data = {};
    if (title) data.title = title;
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (status) data.status = status;
    if (resultsPublished !== undefined) data.resultsPublished = resultsPublished;
    const election = await prisma.election.update({ where: { id }, data });
    return res.status(200).json(election);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update election' });
  }
});
app.get('/api/election/results/:electionId', requireAuth, async (req, res) => {
  const electionId = Number(req.params.electionId);
  try {
    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election) return res.status(404).json({ message: 'Election not found' });
    if (!election.resultsPublished) return res.status(403).json({ message: 'Results not published yet' });
    const applications = await prisma.candidateApplication.findMany({
      where: { electionId, status: 'APPROVED' },
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