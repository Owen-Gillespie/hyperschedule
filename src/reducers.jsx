import {combineReducers} from 'redux-immutable';
import {List, OrderedMap, Map, OrderedSet, Set, fromJS} from 'immutable';

import * as actions from './actions';

import {Mode} from '@/App/mode';

import search       from './App/CourseSearch/reducers';
import popup        from './App/Popup/reducers';
import importExport from './App/Popup/ImportExport/reducers';

import * as util from '@/util/hyperschedule-util';

const mode = (
  state = Mode.COURSE_SEARCH,
  action
) => (
  action.type === actions.modeSelector.SET_MODE ? (
    action.mode
  ) : (
    state
  )
);

const selectionInitial = Map({
  courses: Map(),
  order: List(),
  checked: Set(),
  starred: Set(),
});
const selection = (prev = Map(), action) => {
  const state = selectionInitial.merge(prev);
  const courses = state.get('courses'),
        order   = state.get('order'),
        checked = state.get('checked'),
        starred = state.get('starred');

  switch (action.type) {
  case actions.courseSearch.ADD_COURSE:
    if (courses.has(action.key)) {
      return state;
    }
    
    return state.merge({
      order: order.push(action.key),
      checked: checked.add(action.key),
    });
    
  case actions.selectedCourses.REORDER: {
    const key = order.get(action.from);
    return state.set(
      'order',
      order.delete(action.from).insert(action.to, key),
    );
  }
  case actions.selectedCourses.REMOVE_COURSE: {
    return state.merge({
      order: order.filter(courseKey => courseKey !== action.key), 
      courses: courses.delete(action.key),
    });
  }
  case actions.selectedCourses.TOGGLE_COURSE_CHECKED: {
    const courseChecked = checked.has(action.key);
    if (checked.has(action.key)) {
      return state.set('checked', checked.delete(action.key));
    } else {
      return state.set('checked', checked.add(action.key));
    }
  }
  case actions.selectedCourses.TOGGLE_COURSE_STARRED: {
    const courseStarred = starred.has(action.key);
    if (starred.has(action.key)) {
      return state.set('starred', starred.delete(action.key));
    } else {
      return state.set('starred', starred.add(action.key));
    }
  }
  default:
    return state;
  }
};

const schedule = (state = Set(), action) => state;
const focus = (state = Map(), action) => state;

const apiInitial = Map({
  courses: Map(),
  order: List(),
  timestamp: 0,
});
function api(prev = Map(), action) {
  const state = apiInitial.merge(prev);
  
  switch (action.type) {
  case actions.ALL_COURSES: {
    let courses = Map();
    
    for (const data of action.courses) {
      const course = util.deserializeCourse(data);
      courses = courses.set(util.courseKey(course), course);
    }
    
    const order = courses.keySeq().sort((keyA, keyB) => {
      const sortA = util.courseSortKey(courses.get(keyA)),
            sortB = util.courseSortKey(courses.get(keyB));

      return sortA < sortB ? -1 : sortA > sortB ? 1 : 0;
    }).toList();
    
    return state.merge({
      courses,
      order,
      timestamp: action.timestamp,
    });
  }

    
  default:
    return state;
                                                   }
}

const app = combineReducers({
  mode,
  search,
  focus,
  selection,
  schedule,
  popup,
  importExport,
  api,
});

export default (prev = Map(), action) => {
  const state = app(prev, action);
  
  switch (action.type) {
  case actions.controls.SHOW_IMPORT_EXPORT:
    return state.setIn(
      ['importExport', 'data'],
      JSON.stringify(
        util.serializeSelection(
          state.get('selection'),
        ),
      )
    );
    
  case actions.importExport.APPLY_DATA: {
    const selection = util.deserializeSelection(
      JSON.parse(
        state.getIn(['importExport', 'data']),
      )
    );
    return state.merge({
      selection,
      schedule: util.computeSchedule(selection),
    });
  }

  case actions.courseSearch.FOCUS_COURSE:
    return state.set(
      'focus',
      state.getIn(['api', 'courses', action.key]),
    );
    
  case actions.selectedCourses.FOCUS_COURSE:
  case actions.schedule.FOCUS_COURSE: 
    return state.set(
      'focus',
      state.getIn(['selection', 'courses', action.key]),
    );

  case actions.courseSearch.ADD_COURSE: {
    const courses = state.getIn(['api', 'courses']);
    const selection = state.get('selection').setIn(['courses', action.key], courses.get(action.key));
    return state.merge({
      selection,
      schedule: util.computeSchedule(selection),
    });
  }
  case actions.selectedCourses.REORDER: 
  case actions.selectedCourses.REMOVE_COURSE: 
  case actions.selectedCourses.TOGGLE_COURSE_CHECKED: 
  case actions.selectedCourses.TOGGLE_COURSE_STARRED: {
    const selection = state.get('selection');
    return state.set(
      'schedule', util.computeSchedule(selection),
    );
  }

  default:
    return state;
  }
};

