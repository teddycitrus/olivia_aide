-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeUrl" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "palette" JSONB NOT NULL,
    "photoStyle" TEXT NOT NULL,
    "typography" JSONB NOT NULL,
    "toneWords" TEXT[],
    "toneVector" DOUBLE PRECISION[],
    "sourceAssets" JSONB NOT NULL,
    "productHeroes" JSONB NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scoring" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "paletteMatch" DOUBLE PRECISION NOT NULL,
    "typographyMatch" DOUBLE PRECISION NOT NULL,
    "photoStyleMatch" DOUBLE PRECISION NOT NULL,
    "productAccuracy" DOUBLE PRECISION NOT NULL,
    "onBrandOverall" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "matchedHero" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scoring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_domain_key" ON "Brand"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Scoring_candidateId_key" ON "Scoring"("candidateId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scoring" ADD CONSTRAINT "Scoring_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
