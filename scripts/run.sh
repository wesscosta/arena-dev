#!/usr/bin/env sh
set -eu

JAR="target/controle-alunos-0.2.0.jar"

if [ ! -f "$JAR" ]; then
  echo "JAR não encontrado. Execute: mvn clean package"
  exit 1
fi

java -jar "$JAR"
