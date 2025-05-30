# syntax=docker/dockerfile:1.10.0

# MARK: Builder
# TODO(RVT-4168): Compile libfdb from scratch for ARM
FROM --platform=linux/amd64 rust:1.82.0-bookworm AS builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && \
    apt-get install -y \
	curl \
	g++ \
	git \
	libclang-dev \
	libpq-dev \
	libssl-dev \
	pkg-config \
	protobuf-compiler \
	wget \
    ca-certificates \
    g++ \
    git \
    gpg \
    libpq-dev \
    libssl-dev \
    openssl \
    pkg-config \
    protobuf-compiler \
    wget && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
	corepack enable && \
	curl -Lf -o /lib/libfdb_c.so "https://github.com/apple/foundationdb/releases/download/7.1.60/libfdb_c.x86_64.so"

# Disable interactive prompt
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Pull via Git CLI to improve reliability in CI
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

WORKDIR /app

COPY . .

# Build and copy all binaries from target directory into an empty image (it is not
# included in the output because of cache mount)
RUN \
	--mount=type=secret,id=netrc,target=/root/.netrc,mode=0600 \
    --mount=type=secret,id=fontawesome_package_token,env=FONTAWESOME_PACKAGE_TOKEN \
	--mount=type=cache,target=/usr/local/cargo/git,id=univseral-cargo-git \
	--mount=type=cache,target=/usr/local/cargo/registry,id=univseral-cargo-registry \
	--mount=type=cache,target=/app/target,id=univseral-target \
	--mount=type=cache,target=/app/node_modules,id=universal-node-modules \
	--mount=type=cache,target=/app/.turbo,id=universal-turbo \
	--mount=type=cache,target=/root/.cache,id=universal-user-cache \
	--mount=type=cache,target=/root/.npm,id=universal-user-npm \
	--mount=type=cache,target=/root/.yarn,id=universal-user-yarn \
	RUSTFLAGS="--cfg tokio_unstable" cargo build --bin tivet-server --bin tivet-client --bin tivet-isolate-v8-runner --bin tivet-container-runner && \
	mkdir /app/dist/ && \
	cp target/debug/tivet-server target/debug/tivet-client target/debug/tivet-isolate-v8-runner target/debug/tivet-container-runner /app/dist/

# MARK: Server (Full)
FROM debian:12.9-slim AS server-full

ENV DEBIAN_FRONTEND=noninteractive
# - Install curl for health checks
# - Install go-migrate for running migrations
# - Install database clients to be able to run `tivet db shell ...` (Redis, Postgres, ClickHouse)
RUN apt-get update -y && \
    apt-get install -y \
    ca-certificates \
    openssl \
    curl \
    redis-tools  \
    postgresql-client \
    gpg \
	dirmngr && \
    curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" | tee /etc/apt/sources.list.d/clickhouse.list && \
    apt-get update -y && \
    apt-get install -y clickhouse-client && \
    (curl -L https://github.com/golang-migrate/migrate/releases/download/v4.18.1/migrate.linux-amd64.tar.gz | tar xvz) && \
    mv migrate /usr/local/bin/migrate && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist/tivet-server /usr/bin/tivet-server

CMD ["/usr/bin/tivet-server"]

# MARK: Server (Slim)
FROM debian:12.9-slim AS server-slim

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && \
	apt-get install -y ca-certificates openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist/tivet-server /usr/bin/tivet-server

CMD ["/usr/bin/tivet-server"]

# MARK: Runner base
FROM --platform=linux/amd64 debian:12.9-slim AS base-runner
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && \
	apt-get install -y ca-certificates openssl curl && \
	curl -Lf -o /lib/libfdb_c.so "https://github.com/apple/foundationdb/releases/download/7.1.60/libfdb_c.x86_64.so"

# MARK: Runner (Full)
FROM --platform=linux/amd64 base-runner AS client-full
COPY --from=builder /app/dist/tivet-client /app/dist/tivet-isolate-v8-runner /app/dist/tivet-container-runner /usr/local/bin/
ENTRYPOINT ["tivet-client"]

# MARK: Runner (Isolate V8)
FROM --platform=linux/amd64 base-runner AS isolate-v8-runner
COPY --from=builder /app/dist/tivet-isolate-v8-runner /usr/local/bin/
ENTRYPOINT ["tivet-client"]

# MARK: Runner (Container)
FROM --platform=linux/amd64 base-runner AS container-runner
COPY --from=builder /app/dist/tivet-container-runner /usr/local/bin/
ENTRYPOINT ["tivet-client"]

# MARK: Monlith
FROM --platform=linux/amd64 debian:12.9-slim AS monolith
ENV DEBIAN_FRONTEND=noninteractive

ARG TRAEFIK_VERSION=3.2.1
ARG COCKROACHDB_VERSION=24.2.3
ARG NATS_VERSION=2.9.2
ARG SEAWEEDFS_VERSION=3.79
# See docs-internal/infrastructure/fdb/AVX.md
ARG FDB_VERSION=7.1.60
ARG VECTOR_VERSION=0.42.0
ARG S6_OVERLAY_VERSION=3.2.0.2

# === Install ===
COPY ./docker/monolith/build-scripts /tmp/build-scripts
# Remove the scripts after running since this pulls dependencies for Deno.
RUN /tmp/build-scripts/install.sh && rm -r /tmp/build-scripts

# === Copy Configs ===
COPY ./docker/monolith/run-scripts/ /root/run-scripts

COPY ./docker/monolith/clickhouse/config.xml /etc/clickhouse-server/config.d/config.xml
COPY ./docker/monolith/clickhouse/users.xml /etc/clickhouse-server/users.d/users.xml

COPY ./docker/monolith/seaweedfs /etc/seaweedfs

COPY ./docker/monolith/foundationdb/etc /etc/foundationdb
COPY --chmod=0755 ./docker/monolith/foundationdb/entrypoint.sh /usr/local/bin/foundationdb-entrypoint.sh

COPY ./docker/monolith/vector-client /etc/vector-client
COPY ./docker/monolith/vector-server /etc/vector-server

COPY ./docker/monolith/tivet-server /etc/tivet-server

COPY ./docker/monolith/tivet-guard /etc/tivet-guard

COPY ./docker/monolith/tivet-client /etc/tivet-client

# === Copy Build Artifacts === 
COPY --from=builder /app/dist/tivet-server /usr/local/bin/
COPY --from=builder /app/dist/tivet-client /app/dist/tivet-isolate-v8-runner /app/dist/tivet-container-runner /usr/local/bin/

VOLUME ["/data"]

EXPOSE 8080 8081 8082 7080 7443 7500-7599 7600-7699

ENV S6_LOGGING=1
ENV S6_VERBOSITY=1
ENV S6_KILL_GRACETIME=100
ENV S6_KILL_FINISH_MAXTIME=100

ENTRYPOINT ["/init"]

