import Ember from 'ember';
import { test } from 'ember-qunit';
import '../helpers/define-fixture';
import testHelper from '../test-helper';

module("Side Panel", {
  setup: function() {
    testHelper.setup.apply(this, arguments);

    defineFixture('/teams', {}, {
      "teams": [{
        "name": "Example Team",
        "id": 1,
        "office": "Example Office"
      }]
    });

    defineFixture('/projects', { team_id: '1' }, {
      "projects": [{
        "id": 1,
        "status": "high",
        "name": "Example Project",
        "client_code": "EP",
        "details_url": "/projects/1",
        "created_at": "2009-07-14T17:05:32.909+01:00",
        "angle_ids": [],
        "analyst_1_id": 1,
        "proposed_advisors_count": 0,
        "left_to_schedule_advisors_count": 0,
        "upcoming_interactions_count": 0
      }]
    });
  },

  teardown: function() {
    testHelper.teardown.apply(this, arguments);
  }
});

test("Showing", function() {
  visit('/team');
  click('.project');

  andThen(function() {
    notEqual(find('.side-panel.active > div').children().length, 0);
  });
});

test("Hiding", function() {
  visit('/team');
  click('.project');
  click('.side-panel');

  andThen(function() {
    equal(find('.side-panel').length, 0);
  });
});