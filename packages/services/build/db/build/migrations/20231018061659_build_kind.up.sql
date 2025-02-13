ALTER TABLE builds
	ADD COLUMN kind INT NOT NULL DEFAULT 0,  -- tivet.backend.build.BuildKind
	ADD COLUMN compression INT NOT NULL DEFAULT 0;  -- tivet.backend.build.Compression

