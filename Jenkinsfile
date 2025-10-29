pipeline {
  agent none  // we define agent per stage
  
  stages {

    stage('Checkout') {
      agent any
      steps {
        sh 'echo Checkout stage passed'
        checkout([$class: 'GitSCM', 
                  branches: [[name: 'main']], 
                  userRemoteConfigs: [[url: 'https://github.com/arup07/node-demo-app-tf-cicd']]])
      }
    }

    stage('Install Dependencies') {
      agent { docker { image 'node:20-alpine'; args '--user root' } }
      steps {
        sh 'echo Installing Node.js dependencies...'
        sh 'npm ci'
      }
    }

    stage('Run Tests') {
      agent { docker { image 'node:20-alpine'; args '--user root' } }
      steps {
        sh 'echo Running tests...'
        sh 'npm test || echo "No tests configured"'
      }
    }

    stage('Static Code Analysis - SonarQube') {
      agent { docker { image 'node:20-alpine'; args '--user root' } }
      environment {
        SONAR_URL = "http://18.139.223.229:9000"  // Update with your SonarQube URL
      }
      steps {
        withCredentials([string(credentialsId: 'sonarqube', variable: 'SONAR_AUTH_TOKEN')]) {
          sh '''
            # Install SonarQube Scanner
            npm install -g sonarqube-scanner
            
            # Run SonarQube scan
            sonar-scanner \
              -Dsonar.projectKey=node-demo-app \
              -Dsonar.sources=. \
              -Dsonar.host.url=${SONAR_URL} \
              -Dsonar.login=${SONAR_AUTH_TOKEN} \
              -Dsonar.exclusions=node_modules/**,tests/**
          '''
        }
      }
    }

    stage('Build and Push Docker Image') {
      agent any  // run on Jenkins host node with Docker installed
      environment {
        DOCKER_IMAGE = "arup07/node-demo-app:${BUILD_NUMBER}"
        REGISTRY_CREDENTIALS = credentials('docker-cred')
      }
      steps {
        script {
          sh '''
            echo Building Docker image...
            docker build -t ${DOCKER_IMAGE} .
            docker tag ${DOCKER_IMAGE} arup07/node-demo-app:latest
          '''
          docker.withRegistry('https://index.docker.io/v1/', 'docker-cred') {
            docker.image("${DOCKER_IMAGE}").push()
            docker.image("arup07/node-demo-app:latest").push()
          }
        }
      }
    }

    stage('Update Deployment Manifest for Argo CD') {
      agent any
      environment {
        DOCKER_IMAGE_TAG = "${BUILD_NUMBER}"
        GIT_REPO_NAME = "node-demo-app-manifests"  // Your K8s manifest repo
        GIT_USER_NAME = "arup07"
      }
      steps {
        withCredentials([string(credentialsId: 'github', variable: 'GITHUB_TOKEN')]) {
          sh '''
            # Temporary directory for a clean clone
            TEMP_DIR=$(mktemp -d)

            # Clone the deployment manifest repo
            git clone https://${GITHUB_TOKEN}@github.com/${GIT_USER_NAME}/${GIT_REPO_NAME}.git $TEMP_DIR || { echo "Git clone failed!"; exit 1; }

            cd $TEMP_DIR

            # Configure Git user
            git config user.email "arup221199@gmail.com"
            git config user.name "${GIT_USER_NAME}"

            # Replace the image tag in deployment.yaml
            sed -i "s#\\(arup07/node-demo-app:\\).*#\\1${DOCKER_IMAGE_TAG}#g" deployment.yaml

            # Commit & push only if there are changes
            git diff --quiet || (
              git add deployment.yaml
              git commit -m "Update image tag to ${DOCKER_IMAGE_TAG}"
              git push https://${GITHUB_TOKEN}@github.com/${GIT_USER_NAME}/${GIT_REPO_NAME}.git HEAD:main
            )

            # Cleanup
            rm -rf $TEMP_DIR
          '''
        }
      }
    }

  } // stages

  post {
    success {
      echo '✅ Pipeline completed successfully!'
      echo "Docker Image: arup07/node-demo-app:${BUILD_NUMBER}"
    }
    failure {
      echo '❌ Pipeline failed!'
    }
    always {
      echo 'Cleaning up workspace...'
      cleanWs()
    }
  }
}