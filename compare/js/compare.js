/* global angular */

var tests = {};

function report(report) { // eslint-disable-line no-unused-vars
  tests = report;
}

var compareApp = angular.module('compareApp', ['ui.bootstrap', 'angular-clipboard', 'revealer']);

var defaultMisMatchThreshold = 1;

var TestPair = function (o) {
  this.a = {src: o.pair.reference || '', srcClass: 'reference'};
  this.b = {src: o.pair.test || '', srcClass: 'test'};
  this.c = {src: o.pair.diffImage || '', srcClass: 'diff'};

  this.report = JSON.stringify(o.pair.diff, null, 2);
  this.passed = o.status === 'pass';
  this.meta = o;
  this.meta.misMatchThreshold = (o && o.misMatchThreshold && o.misMatchThreshold >= 0) ? o.misMatchThreshold : defaultMisMatchThreshold;
};

var handleTests = function ($scope) {
  tests.tests.forEach(function (test) {
    $scope.testDuration += test.pair.diff.analysisTime;

    if (test.pair.diff.isSameDimensions) {
      delete test.pair.diff.dimensionDifference;
    }

    delete test.pair.diff.analysisTime;

    if (test.status === 'pass') {
      $scope.passedCount++;
    }

    $scope.testPairs.push(new TestPair(test));
  });
};

compareApp.controller('MainCtrl', ['$scope', '$http', '$uibModal', 'clipboard', function ($scope, $http, $uibModal, clipboard) {
  $scope.name = tests.testSuite;
  $scope.testPairs = [];
  $scope.alerts = [];
  $scope.passedCount = 0;
  $scope.testDuration = 0;
  $scope.testIsRunning = true;
  $scope.isSummaryListCollapsed = true;

  if (!clipboard.supported) {
    $scope.alerts.push({type: 'danger', msg: 'Sorry, copy to clipboard is not supported'});
  }

  handleTests($scope);

  $scope.statusFilter = 'failed';
  if ($scope.passedCount === $scope.testPairs.length) {
    $scope.statusFilter = 'passed';
  }

  $scope.detailFilterOptions = ['failed', 'passed', 'all', 'none'];

  $scope.displayOnStatusFilter = function (o) {
    if ($scope.statusFilter === 'all') {
      return true;
    }

    if ($scope.statusFilter === 'failed' && !o.passed) {
      return true;
    }

    if ($scope.statusFilter === 'passed' && o.passed) {
      return true;
    }

    return false;
  };

  $scope.copyFailedTestsIds = function () {
    var failedTests = '';
    $scope.testPairs.forEach(function (test) {
      if (!test.passed) {
        failedTests = failedTests + test.meta.pair.label + ',';
      }
    });

    if (failedTests) {
      clipboard.copyText(failedTests.substring(0, failedTests.length - 1));
      $scope.alerts.push({type: 'success', msg: 'Failed tests were copied to clipboard'});
    } else {
      $scope.alerts.push({type: 'warning', msg: 'No failed tests were found'});
    }
  };

  $scope.closeAlert = function (index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.openModal = function (size, referenceImg, testImg) {
    $uibModal.open({
      animation: true,
      ariaLabelledBy: 'modal-title',
      ariaDescribedBy: 'modal-body',
      templateUrl: 'myModalContent.html',
      controller: 'ModalInstanceCtrl',
      windowClass: 'modal',
      resolve: {
        referenceImg: function () {
          return referenceImg;
        },
        testImg: function () {
          return testImg;
        }
      }
    });
  };

  $scope.setTestAsNewReference = function (testPair, referenceImg, testImg) {
    var data = JSON.stringify({
      reference: referenceImg,
      test: testImg
    });

    $http.post('http:/localhost:3001/api/reference/replace', data)
      .then(function successCallback() {
        updateTestPair(testPair.meta);
      }, function errorCallback(response) {

      });
  };

  function updateTestPair(testPair) {
    $scope.testPairs = [];
    $scope.passedCount = 0;
    $scope.testDuration = 0;

    // update
    tests.tests.forEach(function (test) {
      if (test.pair.fileName === testPair.pair.fileName) {
        test.status = 'pass';
        test.pair.diff = setTestPairToDDefault();
        delete test.pair.diffImage;
      }
    });

    handleTests($scope);
  }

  function setTestPairToDDefault() {
    return {
      "isSameDimensions": true,
      "dimensionDifference": {
        "width": 0,
        "height": 0
      }
    };
  }

}]);

// Please note that $uibModalInstance represents a modal window (instance) dependency.
// It is not the same as the $uibModal service used above.
compareApp.controller('ModalInstanceCtrl', function ($scope, $uibModalInstance, referenceImg, testImg) {
  $scope.imgPositionValue = 50;

  $scope.selected = {
    referenceImg: referenceImg,
    testImg: testImg
  };

  $scope.setImgPositionValue = function (value) {
    $scope.imgPositionValue = value;
  };

  $scope.ok = function () {
    $uibModalInstance.close();
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});
